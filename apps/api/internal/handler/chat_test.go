package handler_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/new-marty/kanjo/internal/testutil"
)

func TestListConversations(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedConversations(t, testPool)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/chat/conversations", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	data := body["data"].([]interface{})
	if len(data) != 2 {
		t.Errorf("expected 2 conversations, got %d", len(data))
	}
}

func TestGetConversation(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedConversations(t, testPool)

	var convID string
	err := testPool.QueryRow(context.Background(),
		"SELECT id::text FROM kanjo.chat_conversations LIMIT 1").Scan(&convID)
	if err != nil {
		t.Fatalf("failed to get conversation ID: %v", err)
	}

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, fmt.Sprintf("/api/v1/chat/conversations/%s", convID), nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	body := testutil.DecodeJSON[map[string]interface{}](t, rec)
	messages := body["messages"].([]interface{})
	if len(messages) != 2 {
		t.Errorf("expected 2 messages, got %d", len(messages))
	}
}

func TestGetConversation_NotFound(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)

	rec := testutil.DoRequest(t, testRouter, http.MethodGet, "/api/v1/chat/conversations/00000000-0000-0000-0000-000000000000", nil)
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestDeleteConversation(t *testing.T) {
	setup(t)
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	testutil.SeedConversations(t, testPool)

	var convID string
	err := testPool.QueryRow(context.Background(),
		"SELECT id::text FROM kanjo.chat_conversations LIMIT 1").Scan(&convID)
	if err != nil {
		t.Fatalf("failed to get conversation ID: %v", err)
	}

	rec := testutil.DoRequest(t, testRouter, http.MethodDelete, fmt.Sprintf("/api/v1/chat/conversations/%s", convID), nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	status := testutil.DecodeJSON[map[string]string](t, rec)
	if status["status"] != "ok" {
		t.Errorf("expected status ok, got %s", status["status"])
	}

	rec = testutil.DoRequest(t, testRouter, http.MethodGet, fmt.Sprintf("/api/v1/chat/conversations/%s", convID), nil)
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404 after delete, got %d: %s", rec.Code, rec.Body.String())
	}
}
