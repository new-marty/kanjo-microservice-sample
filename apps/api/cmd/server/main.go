package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/config"
	"github.com/new-marty/kanjo/internal/db"
	"github.com/new-marty/kanjo/internal/handler"
	"github.com/new-marty/kanjo/internal/llm"
	"github.com/new-marty/kanjo/internal/middleware"
	"github.com/new-marty/kanjo/internal/repository"
	"github.com/new-marty/kanjo/internal/service"
)

func main() {
	cfg := config.Load()

	// Initialize structured logging
	var logHandler slog.Handler
	if cfg.LogFormat == "json" {
		logHandler = slog.NewJSONHandler(os.Stdout, nil)
	} else {
		logHandler = slog.NewTextHandler(os.Stdout, nil)
	}
	slog.SetDefault(slog.New(logHandler))

	// Parse CORS origins
	var origins []string
	for _, o := range strings.Split(cfg.CORSOrigins, ",") {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	// Create context for startup
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Initialize database connection
	dbCfg := db.DefaultConfig()
	pool, err := db.New(ctx, dbCfg)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	slog.Info("connected to database")

	// Create repository
	queries := repository.New(pool)

	// Create settings service and seed from env vars
	settingsSvc := service.NewSettingsService(queries)
	settingsSvc.SeedFromEnv(ctx)

	// Create LLM client with dynamic API key from settings
	llmClient := llm.New(func() string {
		val, _ := settingsSvc.GetPlaintext(context.Background(), "openrouter_api_key")
		return val
	}, cfg.OpenRouterURL)

	// Create services
	transactionSvc := service.NewTransactionService(queries)
	analyticsSvc := service.NewAnalyticsService(queries)
	budgetSvc := service.NewBudgetService(queries)
	goalSvc := service.NewGoalService(queries)
	insightSvc := service.NewInsightService(queries)
	institutionSvc := service.NewInstitutionService(queries)
	syncSvc := service.NewSyncService(queries)
	chatSvc := service.NewChatService(queries, llmClient, func() string {
		val, _ := settingsSvc.GetPlaintext(context.Background(), "llm_model")
		if val == "" {
			return "anthropic/claude-haiku-4.5"
		}
		return val
	})

	// Create handlers
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

	// Setup router
	r := gin.New()
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS(origins))
	r.Use(gin.Recovery())

	// Health check
	r.GET("/api/health", healthHandler.Health)

	// API v1 routes
	api := r.Group("/api/v1")
	api.Use(middleware.Timeout(30 * time.Second))
	{
		// Analytics
		api.GET("/analytics/dashboard", analyticsHandler.GetDashboard)
		api.GET("/analytics/net-worth", analyticsHandler.GetNetWorth)
		api.GET("/analytics/monthly-summary", analyticsHandler.GetMonthlySummary)
		api.GET("/analytics/spending-pace", analyticsHandler.GetSpendingPace)
		api.GET("/analytics/spending-by-category", analyticsHandler.SpendingByCategory)
		api.GET("/analytics/cash-flow", analyticsHandler.GetCashFlow)
		api.GET("/analytics/asset-composition", analyticsHandler.GetAssetComposition)
		api.GET("/analytics/asset-trend", analyticsHandler.GetAssetTrend)
		api.GET("/analytics/daily-rankings", analyticsHandler.GetDailyRankings)

		// Transactions
		api.GET("/transactions", transactionHandler.ListTransactions)
		api.GET("/transactions/:hash", transactionHandler.GetTransaction)
		api.PATCH("/transactions/:hash/review", transactionHandler.ReviewTransaction)

		// Budgets
		api.GET("/budgets", budgetHandler.ListBudgets)
		api.PUT("/budgets", budgetHandler.UpsertBudget)
		api.DELETE("/budgets/:category", budgetHandler.DeleteBudget)
		api.GET("/budgets/:category/periods", budgetHandler.GetBudgetPeriods)

		// Goals
		api.GET("/goals", goalHandler.ListGoals)
		api.POST("/goals", goalHandler.CreateGoal)
		api.PUT("/goals/:id", goalHandler.UpdateGoal)
		api.DELETE("/goals/:id", goalHandler.DeleteGoal)

		// Insights
		api.GET("/insights", insightHandler.ListInsights)
		api.POST("/insights/:id/dismiss", insightHandler.DismissInsight)

		// Institutions
		api.GET("/institutions", institutionHandler.ListInstitutions)
		api.PATCH("/institutions/:name", institutionHandler.UpdateInstitution)

		// Sync
		api.GET("/sync/status", syncHandler.GetSyncStatus)

		// Settings
		api.GET("/settings", settingsHandler.ListSettings)
		api.PUT("/settings/:key", settingsHandler.UpdateSetting)

		// Chat (non-streaming)
		api.GET("/chat/conversations", chatHandler.ListConversations)
		api.GET("/chat/conversations/:id", chatHandler.GetConversation)
		api.DELETE("/chat/conversations/:id", chatHandler.DeleteConversation)
	}

	// Chat SSE endpoint without timeout (long-running stream)
	r.POST("/api/v1/chat", chatHandler.Chat)

	addr := ":" + cfg.Port

	// Create server
	srv := &http.Server{
		Addr:    addr,
		Handler: r,
	}

	// Start server in goroutine
	go func() {
		slog.Info("starting server", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("shutting down server")

	// Graceful shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server shutdown error", "error", err)
	}

	slog.Info("server stopped")
}
