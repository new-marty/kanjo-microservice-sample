package service_test

import (
	"fmt"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/new-marty/kanjo/internal/repository"
	"github.com/new-marty/kanjo/internal/testutil"
)

var (
	testPool    *pgxpool.Pool
	testQueries *repository.Queries
)

func TestMain(m *testing.M) {
	pool, err := testutil.ConnectTestDB()
	if err != nil {
		fmt.Fprintf(os.Stderr, "skipping service tests: %v\n", err)
		os.Exit(0)
	}

	if err := testutil.RunMigrations(); err != nil {
		pool.Close()
		fmt.Fprintf(os.Stderr, "failed to run migrations: %v\n", err)
		os.Exit(1)
	}

	testPool = pool
	testQueries = repository.New(pool)

	code := m.Run()
	pool.Close()
	os.Exit(code)
}
