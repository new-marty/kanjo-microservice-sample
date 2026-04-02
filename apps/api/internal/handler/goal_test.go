package handler_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/new-marty/kanjo/internal/testutil"
)

func TestGoals_CRUD(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, "kanjo.savings_goals")

	// Create
	createBody := map[string]interface{}{
		"name":           "旅行資金",
		"target_amount":  500000,
		"current_amount": 100000,
		"icon":           "✈️",
		"color":          "#0891B2",
	}
	rec := testutil.DoRequest(t, testRouter, http.MethodPost, "/api/v1/goals", createBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	created := testutil.DecodeJSON[map[string]interface{}](t, rec)
	goalID := created["id"].(float64)
	if created["name"] != "旅行資金" {
		t.Errorf("expected name 旅行資金, got %v", created["name"])
	}
	if created["target_amount"].(float64) != 500000 {
		t.Errorf("expected target_amount 500000, got %v", created["target_amount"])
	}

	// List
	rec = testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/goals", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	listBody := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := listBody["data"].([]interface{})
	if len(data) != 1 {
		t.Fatalf("expected 1 goal, got %d", len(data))
	}

	// Update
	updateBody := map[string]interface{}{
		"name":           "海外旅行資金",
		"current_amount": 200000,
	}
	rec = testutil.DoRequest(t, testRouter, http.MethodPut, fmt.Sprintf("/api/v1/goals/%d", int(goalID)), updateBody)
	if rec.Code != http.StatusOK {
		t.Fatalf("update: expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Verify update
	rec = testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/goals", nil)
	listBody = testutil.DecodeJSON[map[string]interface{}](t, rec)
	data = listBody["data"].([]interface{})
	goal := data[0].(map[string]interface{})
	if goal["name"] != "海外旅行資金" {
		t.Errorf("expected updated name, got %v", goal["name"])
	}

	// Delete
	rec = testutil.DoRequest(t, testRouter, http.MethodDelete, fmt.Sprintf("/api/v1/goals/%d", int(goalID)), nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete: expected 204, got %d: %s", rec.Code, rec.Body.String())
	}

	// Verify deleted
	rec = testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/goals", nil)
	listBody = testutil.DecodeJSON[map[string]interface{}](t, rec)
	data = listBody["data"].([]interface{})
	if len(data) != 0 {
		t.Errorf("expected 0 goals after delete, got %d", len(data))
	}
}

func TestCreateGoal_Validation(t *testing.T) {
	setup(t)

	tests := []struct {
		name string
		body map[string]interface{}
	}{
		{"missing name", map[string]interface{}{"target_amount": 100000}},
		{"missing target_amount", map[string]interface{}{"name": "test"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := testutil.DoRequest(t, testRouter, http.MethodPost, "/api/v1/goals", tt.body)
			if rec.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d: %s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestGoal_NotFound(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, "kanjo.savings_goals")

	// Update nonexistent
	rec := testutil.DoRequest(t, testRouter, http.MethodPut, "/api/v1/goals/99999", map[string]interface{}{"name": "x"})
	if rec.Code != http.StatusNotFound {
		t.Errorf("update nonexistent: expected 404, got %d: %s", rec.Code, rec.Body.String())
	}

	// Delete nonexistent
	rec = testutil.DoRequest(t, testRouter, http.MethodDelete, "/api/v1/goals/99999", nil)
	if rec.Code != http.StatusNotFound {
		t.Errorf("delete nonexistent: expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}
