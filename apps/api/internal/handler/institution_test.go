package handler_test

import (
	"net/http"
	"testing"

	"github.com/new-marty/kanjo/internal/testutil"
)

func TestListInstitutions(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedInstitutions(t, testPool)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/institutions", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := body["data"].([]interface{})
	if len(data) != 2 {
		t.Errorf("expected 2 institutions, got %d", len(data))
	}
}

func TestUpdateInstitution(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedInstitutions(t, testPool)

	updateBody := map[string]interface{}{
		"display_name": "三菱UFJ",
		"color":        "#FF0000",
	}

	rec := testutil.DoRequest(t, testRouter, http.MethodPatch, "/api/v1/institutions/三菱UFJ銀行", updateBody)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	status := testutil.DecodeJSON[map[string]string](t, rec)
	if status["status"] != "ok" {
		t.Errorf("expected status ok, got %s", status["status"])
	}
}

func TestUpdateInstitution_NotFound(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)

	updateBody := map[string]interface{}{
		"display_name": "Test",
	}

	rec := testutil.DoRequest(t, testRouter, http.MethodPatch, "/api/v1/institutions/nonexistent_bank", updateBody)
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}
