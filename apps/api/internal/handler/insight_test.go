package handler_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/new-marty/kanjo/internal/testutil"
)

func TestListInsights(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedInsights(t, testPool)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/insights", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := body["data"].([]interface{})
	if len(data) != 2 {
		t.Errorf("expected 2 non-dismissed insights, got %d", len(data))
	}
}

func TestListInsights_Empty(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, "kanjo.insights")

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/insights", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := body["data"].([]interface{})
	if len(data) != 0 {
		t.Errorf("expected 0 insights, got %d", len(data))
	}
}

func TestDismissInsight(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, "kanjo.insights")
	testutil.SeedInsights(t, testPool)

	// Get an active insight ID
	var insightID int64
	err := testPool.QueryRow(context.Background(),
		"SELECT id FROM kanjo.insights WHERE dismissed = false LIMIT 1").Scan(&insightID)
	if err != nil {
		t.Fatalf("failed to get insight ID: %v", err)
	}

	// Dismiss it
	rec := testutil.DoRequest(t, testRouter, http.MethodPost, fmt.Sprintf("/api/v1/insights/%d/dismiss", insightID), nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	status := testutil.DecodeJSON[map[string]string](t, rec)
	if status["status"] != "ok" {
		t.Errorf("expected status ok, got %s", status["status"])
	}

	// Verify it's no longer in the list
	rec = testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/insights", nil)
	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := body["data"].([]interface{})
	if len(data) != 1 {
		t.Errorf("expected 1 insight after dismiss, got %d", len(data))
	}
}

func TestDismissInsight_NotFound(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, "kanjo.insights")

	rec := testutil.DoRequest(t, testRouter, http.MethodPost, "/api/v1/insights/99999/dismiss", nil)
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestDismissInsight_InvalidID(t *testing.T) {
	setup(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodPost, "/api/v1/insights/abc/dismiss", nil)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}
