package handler_test

import (
	"net/http"
	"testing"

	"github.com/new-marty/kanjo/internal/testutil"
)

func TestGetSyncStatus(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedAll(t, testPool)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/sync/status", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	if _, ok := body["transactions_processed"]; !ok {
		t.Error("expected transactions_processed field in response")
	}
	if _, ok := body["transactions_transformed"]; !ok {
		t.Error("expected transactions_transformed field in response")
	}
}
