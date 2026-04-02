package handler_test

import (
	"fmt"
	"net/http"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/new-marty/kanjo/internal/testutil"
)

var (
	testPool   *pgxpool.Pool
	testRouter *gin.Engine
)

func TestMain(m *testing.M) {
	pool, err := testutil.ConnectTestDB()
	if err != nil {
		fmt.Fprintf(os.Stderr, "skipping integration tests: %v\n", err)
		os.Exit(0)
	}

	if err := testutil.RunMigrations(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to run migrations: %v\n", err)
		pool.Close()
		os.Exit(1)
	}

	testPool = pool
	testRouter = testutil.SetupRouter(pool)

	code := m.Run()
	pool.Close()
	os.Exit(code)
}

func setup(t *testing.T) {
	t.Helper()
	if testPool == nil {
		t.Skip("test database not available")
	}
}

func TestHealth_OK(t *testing.T) {
	setup(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/health", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]string](t, rec)
	if body["status"] != "ok" {
		t.Errorf("expected status ok, got %s", body["status"])
	}
	if body["database"] != "connected" {
		t.Errorf("expected database connected, got %s", body["database"])
	}
}
