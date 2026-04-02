package handler_test

import (
	"net/http"
	"testing"

	"github.com/new-marty/kanjo/internal/testutil"
)

func seedAndGetTransactionHash(t *testing.T) string {
	t.Helper()

	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedAll(t, testPool)

	// Get first transaction hash from list
	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/transactions?limit=1", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("list transactions: expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := body["data"].([]interface{})
	if len(data) == 0 {
		t.Fatal("no transactions returned after seeding")
	}

	return data[0].(map[string]interface{})["hash"].(string)
}

func TestListTransactions(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedAll(t, testPool)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/transactions", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := body["data"].([]interface{})
	total := body["total"].(float64)

	if len(data) == 0 {
		t.Error("expected transactions in response")
	}
	if total == 0 {
		t.Error("expected non-zero total")
	}
}

func TestListTransactions_Filters(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedAll(t, testPool)

	t.Run("pagination", func(t *testing.T) {
		rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/transactions?limit=2&offset=0", nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
		body := testutil.DecodeJSON[map[string]interface{}](t, rec)
		data := body["data"].([]interface{})
		if len(data) > 2 {
			t.Errorf("expected at most 2 results, got %d", len(data))
		}
	})

	t.Run("category filter", func(t *testing.T) {
		rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/transactions?categories=income-salary", nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
		body := testutil.DecodeJSON[map[string]interface{}](t, rec)
		data := body["data"].([]interface{})
		for _, item := range data {
			tx := item.(map[string]interface{})
			if tx["category_id"] != nil && tx["category_id"] != "income-salary" {
				t.Errorf("expected category income-salary, got %v", tx["category_id"])
			}
		}
	})

	t.Run("reviewed filter", func(t *testing.T) {
		rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/transactions?reviewed=true", nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
		body := testutil.DecodeJSON[map[string]interface{}](t, rec)
		data := body["data"].([]interface{})
		for _, item := range data {
			tx := item.(map[string]interface{})
			if tx["reviewed"] != true {
				t.Errorf("expected reviewed=true, got %v", tx["reviewed"])
			}
		}
	})
}

func TestGetTransaction(t *testing.T) {
	setup(t)
	hash := seedAndGetTransactionHash(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/transactions/"+hash, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	if body["hash"] != hash {
		t.Errorf("expected hash %s, got %v", hash, body["hash"])
	}
}

func TestGetTransaction_NotFound(t *testing.T) {
	setup(t)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/transactions/nonexistent_hash", nil)
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestReviewTransaction(t *testing.T) {
	setup(t)
	hash := seedAndGetTransactionHash(t)

	reviewBody := map[string]interface{}{
		"reviewed": true,
		"tags":     []string{"確認済み"},
		"notes":    "テストメモ",
	}
	rec := testutil.DoRequest(t, testRouter, http.MethodPatch, "/api/v1/transactions/"+hash+"/review", reviewBody)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	status := testutil.DecodeJSON[map[string]string](t, rec)
	if status["status"] != "ok" {
		t.Errorf("expected status ok, got %s", status["status"])
	}
}

func TestReviewTransaction_NotFound(t *testing.T) {
	setup(t)

	reviewBody := map[string]interface{}{"reviewed": true}
	rec := testutil.DoRequest(t, testRouter, http.MethodPatch, "/api/v1/transactions/nonexistent_hash/review", reviewBody)
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}
