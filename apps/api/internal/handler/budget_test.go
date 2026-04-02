package handler_test

import (
	"net/http"
	"testing"

	"github.com/new-marty/kanjo/internal/testutil"
)

func TestBudgets_CRUD(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, "kanjo.budget_periods", "kanjo.budget_categories")

	// Upsert (create)
	upsertBody := map[string]interface{}{
		"category_name":  "expense-food",
		"monthly_budget": 60000,
		"color":          "#F97316",
	}
	rec := testutil.DoRequest(t, testRouter, http.MethodPut, "/api/v1/budgets", upsertBody)
	if rec.Code != http.StatusOK {
		t.Fatalf("upsert create: expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// List
	rec = testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/budgets", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	listBody := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := listBody["data"].([]interface{})
	if len(data) != 1 {
		t.Fatalf("expected 1 budget, got %d", len(data))
	}

	budget := data[0].(map[string]interface{})
	if budget["category_name"] != "expense-food" {
		t.Errorf("expected category_name expense-food, got %v", budget["category_name"])
	}

	// Upsert (update)
	upsertBody["monthly_budget"] = 70000
	rec = testutil.DoRequest(t, testRouter, http.MethodPut, "/api/v1/budgets", upsertBody)
	if rec.Code != http.StatusOK {
		t.Fatalf("upsert update: expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Delete
	rec = testutil.DoRequest(t, testRouter, http.MethodDelete, "/api/v1/budgets/expense-food", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete: expected 204, got %d: %s", rec.Code, rec.Body.String())
	}

	// Verify deleted
	rec = testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/budgets", nil)
	listBody = testutil.DecodeJSON[map[string]interface{}](t, rec)
	data = listBody["data"].([]interface{})
	if len(data) != 0 {
		t.Errorf("expected 0 budgets after delete, got %d", len(data))
	}
}

func TestUpsertBudget_Validation(t *testing.T) {
	setup(t)

	tests := []struct {
		name string
		body map[string]interface{}
	}{
		{"missing category_name", map[string]interface{}{"monthly_budget": 50000}},
		{"missing monthly_budget", map[string]interface{}{"category_name": "expense-food"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := testutil.DoRequest(t, testRouter, http.MethodPut, "/api/v1/budgets", tt.body)
			if rec.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d: %s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestGetBudgetPeriods(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, "kanjo.budget_periods", "kanjo.budget_categories")

	// Create a budget with a period
	testutil.SeedBudgets(t, testPool)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/budgets/expense-food/periods", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := body["data"].([]interface{})
	if len(data) == 0 {
		t.Error("expected at least 1 budget period")
	}
}
