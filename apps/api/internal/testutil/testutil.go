package testutil

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/new-marty/kanjo/internal/handler"
	"github.com/new-marty/kanjo/internal/llm"
	"github.com/new-marty/kanjo/internal/middleware"
	"github.com/new-marty/kanjo/internal/repository"
	"github.com/new-marty/kanjo/internal/service"
	"github.com/pressly/goose/v3"

	_ "github.com/jackc/pgx/v5/stdlib"
)

const defaultTestDatabaseURL = "postgres://dev:dev@localhost:5432/kanjo_test?sslmode=disable"

func testDatabaseURL() string {
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		dbURL = defaultTestDatabaseURL
	}
	return dbURL
}

// SetupTestDB connects to the test database, runs migrations, and returns a pool.
// It calls t.Skip if the database is unavailable.
func SetupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	pool, err := ConnectTestDB()
	if err != nil {
		t.Skipf("skipping integration test: %v", err)
	}

	if err := RunMigrations(); err != nil {
		pool.Close()
		t.Fatalf("failed to run migrations: %v", err)
	}

	return pool
}

// ConnectTestDB connects to the test database and returns the pool.
// Unlike SetupTestDB, it returns an error instead of calling t.Skip,
// making it suitable for use in TestMain where *testing.T is not available.
// Callers are responsible for closing the pool.
func ConnectTestDB() (*pgxpool.Pool, error) {
	dbURL := testDatabaseURL()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		return nil, fmt.Errorf("cannot connect to test database: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("cannot ping test database: %w", err)
	}

	return pool, nil
}

// RunMigrations runs database migrations. For use in TestMain where *testing.T
// is not available.
func RunMigrations() error {
	dbURL := testDatabaseURL()

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		return fmt.Errorf("failed to open db for migrations: %w", err)
	}
	defer func() { _ = db.Close() }()

	goose.SetBaseFS(os.DirFS(migrationsDir()))
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("failed to set goose dialect: %w", err)
	}

	if err := goose.Up(db, "."); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

func migrationsDir() string {
	// Walk up from testutil to find db/migrations
	candidates := []string{
		"../../db/migrations",
		"../../../db/migrations",
		"../../../../db/migrations",
	}
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && info.IsDir() {
			return c
		}
	}
	// Return relative from apps/api
	return "db/migrations"
}

// CleanTables truncates the given tables with CASCADE.
func CleanTables(t *testing.T, pool *pgxpool.Pool, tables ...string) {
	t.Helper()

	ctx := context.Background()
	for _, table := range tables {
		if _, err := pool.Exec(ctx, fmt.Sprintf("TRUNCATE %s CASCADE", table)); err != nil {
			t.Fatalf("failed to truncate %s: %v", table, err)
		}
	}
}

// SetupRouter creates a Gin engine with all routes wired, matching cmd/server/main.go.
func SetupRouter(pool *pgxpool.Pool) *gin.Engine {
	gin.SetMode(gin.TestMode)

	queries := repository.New(pool)

	transactionSvc := service.NewTransactionService(queries)
	analyticsSvc := service.NewAnalyticsService(queries)
	budgetSvc := service.NewBudgetService(queries)
	goalSvc := service.NewGoalService(queries)
	insightSvc := service.NewInsightService(queries)
	institutionSvc := service.NewInstitutionService(queries)
	syncSvc := service.NewSyncService(queries)
	settingsSvc := service.NewSettingsService(queries)
	llmClient := llm.New(func() string { return "" }, "https://openrouter.ai/api/v1")
	chatSvc := service.NewChatService(queries, llmClient, func() string { return "anthropic/claude-haiku-4.5" })

	healthHandler := handler.NewHealthHandler(pool)
	transactionHandler := handler.NewTransactionHandler(transactionSvc)
	analyticsHandler := handler.NewAnalyticsHandler(analyticsSvc)
	budgetHandler := handler.NewBudgetHandler(budgetSvc)
	goalHandler := handler.NewGoalHandler(goalSvc)
	insightHandler := handler.NewInsightHandler(insightSvc)
	institutionHandler := handler.NewInstitutionHandler(institutionSvc)
	syncHandler := handler.NewSyncHandler(syncSvc)
	chatHandler := handler.NewChatHandler(chatSvc)
	settingsHandler := handler.NewSettingsHandler(settingsSvc)

	r := gin.New()
	r.Use(middleware.CORS([]string{"http://localhost:3000"}))

	r.GET("/api/health", healthHandler.Health)

	api := r.Group("/api/v1")
	{
		api.GET("/analytics/dashboard", analyticsHandler.GetDashboard)
		api.GET("/analytics/net-worth", analyticsHandler.GetNetWorth)
		api.GET("/analytics/monthly-summary", analyticsHandler.GetMonthlySummary)
		api.GET("/analytics/spending-pace", analyticsHandler.GetSpendingPace)
		api.GET("/analytics/spending-by-category", analyticsHandler.SpendingByCategory)
		api.GET("/analytics/cash-flow", analyticsHandler.GetCashFlow)
		api.GET("/analytics/asset-composition", analyticsHandler.GetAssetComposition)
		api.GET("/analytics/asset-trend", analyticsHandler.GetAssetTrend)
		api.GET("/analytics/daily-rankings", analyticsHandler.GetDailyRankings)

		api.GET("/transactions", transactionHandler.ListTransactions)
		api.GET("/transactions/:hash", transactionHandler.GetTransaction)
		api.PATCH("/transactions/:hash/review", transactionHandler.ReviewTransaction)

		api.GET("/budgets", budgetHandler.ListBudgets)
		api.PUT("/budgets", budgetHandler.UpsertBudget)
		api.DELETE("/budgets/:category", budgetHandler.DeleteBudget)
		api.GET("/budgets/:category/periods", budgetHandler.GetBudgetPeriods)

		api.GET("/goals", goalHandler.ListGoals)
		api.POST("/goals", goalHandler.CreateGoal)
		api.PUT("/goals/:id", goalHandler.UpdateGoal)
		api.DELETE("/goals/:id", goalHandler.DeleteGoal)

		api.GET("/insights", insightHandler.ListInsights)
		api.POST("/insights/:id/dismiss", insightHandler.DismissInsight)

		api.GET("/institutions", institutionHandler.ListInstitutions)
		api.PATCH("/institutions/:name", institutionHandler.UpdateInstitution)

		api.GET("/sync/status", syncHandler.GetSyncStatus)

		api.GET("/settings", settingsHandler.ListSettings)
		api.PUT("/settings/:key", settingsHandler.UpdateSetting)

		api.POST("/chat", chatHandler.Chat)
		api.GET("/chat/conversations", chatHandler.ListConversations)
		api.GET("/chat/conversations/:id", chatHandler.GetConversation)
		api.DELETE("/chat/conversations/:id", chatHandler.DeleteConversation)
	}

	return r
}

// DoRequest performs an HTTP request against the router and returns the recorder.
func DoRequest(t *testing.T, router *gin.Engine, method, path string, body interface{}) *httptest.ResponseRecorder {
	t.Helper()

	var reqBody *bytes.Buffer
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
		reqBody = bytes.NewBuffer(b)
	} else {
		reqBody = &bytes.Buffer{}
	}

	req := httptest.NewRequest(method, path, reqBody)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

// DecodeJSON decodes a JSON response body into the given type.
func DecodeJSON[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()

	var result T
	if err := json.NewDecoder(rec.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response JSON: %v\nbody: %s", err, rec.Body.String())
	}
	return result
}

// StringPtr returns a pointer to the given string.
func StringPtr(s string) *string { return &s }

// Int64Ptr returns a pointer to the given int64.
func Int64Ptr(n int64) *int64 { return &n }

// BoolPtr returns a pointer to the given bool.
func BoolPtr(b bool) *bool { return &b }

// AllTables returns all kanjo schema tables in dependency-safe truncation order.
func AllTables() []string {
	return []string{
		"kanjo.chat_messages",
		"kanjo.chat_conversations",
		"kanjo.transfer_pairs",
		"kanjo.daily_assets",
		"kanjo.transactions",
		"kanjo.budget_periods",
		"kanjo.budget_categories",
		"kanjo.savings_goals",
		"kanjo.insights",
		"kanjo.recurring_patterns",
		"kanjo.merchants",
		"kanjo.institutions",
	}
}

// AllTablesWithRaw returns all tables for a full clean including mf_raw.
func AllTablesWithRaw() []string {
	return append(AllTables(), "mf_raw.transactions", "mf_raw.daily_assets")
}

// JoinPath joins URL path segments, handling slashes.
func JoinPath(parts ...string) string {
	return strings.Join(parts, "")
}
