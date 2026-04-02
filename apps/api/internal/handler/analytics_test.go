package handler_test

import (
	"net/http"
	"testing"

	"github.com/new-marty/kanjo/internal/testutil"
)

func setupAnalytics(t *testing.T) {
	t.Helper()
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedAll(t, testPool)
}

func TestGetDashboard(t *testing.T) {
	setupAnalytics(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/analytics/dashboard", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	if body["net_worth"] == nil {
		t.Error("expected net_worth in response")
	}
	if body["monthly_summary"] == nil {
		t.Error("expected monthly_summary in response")
	}
	if body["spending_pace"] == nil {
		t.Error("expected spending_pace in response")
	}
}

func TestGetNetWorth(t *testing.T) {
	setupAnalytics(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/analytics/net-worth", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	if body["history"] == nil {
		t.Error("expected history in response")
	}
}

func TestGetMonthlySummary(t *testing.T) {
	setupAnalytics(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/analytics/monthly-summary", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	// Verify response shape
	for _, key := range []string{"income", "expenses", "saved", "savings_rate"} {
		if _, ok := body[key]; !ok {
			t.Errorf("expected %s in response", key)
		}
	}
}

func TestGetSpendingPace(t *testing.T) {
	setupAnalytics(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/analytics/spending-pace", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	for _, key := range []string{"days_in_month", "day_of_month", "actual_spending"} {
		if _, ok := body[key]; !ok {
			t.Errorf("expected %s in response", key)
		}
	}
}

func TestGetCashFlow(t *testing.T) {
	setupAnalytics(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/analytics/cash-flow", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	if body["data"] == nil {
		t.Error("expected data in response")
	}
}

func TestSpendingByCategory(t *testing.T) {
	setupAnalytics(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/analytics/spending-by-category", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	if body["data"] == nil {
		t.Error("expected data in response")
	}
}

func TestGetAssetComposition(t *testing.T) {
	setupAnalytics(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/analytics/asset-composition", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	if body["data"] == nil {
		t.Error("expected data in response")
	}
}

func TestGetAssetTrend(t *testing.T) {
	setupAnalytics(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/analytics/asset-trend", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	if body["data"] == nil {
		t.Error("expected data in response")
	}
}

func TestGetDailyRankings(t *testing.T) {
	setupAnalytics(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/analytics/daily-rankings", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	if body["data"] == nil {
		t.Error("expected data in response")
	}
}
