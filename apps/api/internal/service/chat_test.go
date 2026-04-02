package service_test

import (
	"context"
	"testing"

	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/llm"
	"github.com/new-marty/kanjo/internal/service"
	"github.com/new-marty/kanjo/internal/testutil"
)

// mockStreamer is a test double for llm.Streamer.
type mockStreamer struct {
	chunks []llm.StreamChunk
}

func (m *mockStreamer) StreamChat(_ context.Context, _ string, _ []llm.Message) <-chan llm.StreamChunk {
	ch := make(chan llm.StreamChunk, len(m.chunks))
	for _, c := range m.chunks {
		ch <- c
	}
	close(ch)
	return ch
}

func newMockStreamer(content string) *mockStreamer {
	return &mockStreamer{
		chunks: []llm.StreamChunk{
			{Content: content},
			{Done: true},
		},
	}
}

func TestSendMessage_NewConversation(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	mock := newMockStreamer("Hello!")
	svc := service.NewChatService(testQueries, mock, func() string { return "test-model" })

	convID, stream, err := svc.SendMessage(context.Background(), nil, "Hi there", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if convID == "" {
		t.Error("expected non-empty conversation ID")
	}
	if stream == nil {
		t.Error("expected non-nil stream")
	}

	// Drain stream
	for range stream {
	}
}

func TestSendMessage_ExistingConversation(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	mock := newMockStreamer("Response")
	svc := service.NewChatService(testQueries, mock, func() string { return "test-model" })

	// Create first message
	convID, stream, err := svc.SendMessage(context.Background(), nil, "First message", nil)
	if err != nil {
		t.Fatalf("unexpected error creating conversation: %v", err)
	}
	for range stream {
	}

	// Send second message to same conversation
	convID2, stream2, err := svc.SendMessage(context.Background(), &convID, "Second message", nil)
	if err != nil {
		t.Fatalf("unexpected error continuing conversation: %v", err)
	}
	if convID2 != convID {
		t.Errorf("expected same conversation ID %s, got %s", convID, convID2)
	}
	for range stream2 {
	}
}

func TestSendMessage_InvalidConversationID(t *testing.T) {
	svc := service.NewChatService(testQueries, newMockStreamer(""), func() string { return "test-model" })

	invalidID := "not-a-uuid"
	_, _, err := svc.SendMessage(context.Background(), &invalidID, "test", nil)
	if err == nil {
		t.Fatal("expected error for invalid conversation_id")
	}
	if !apperror.IsInvalidInput(err) {
		t.Errorf("expected InvalidInput error, got: %v", err)
	}
}

func TestSendMessage_ConversationNotFound(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewChatService(testQueries, newMockStreamer(""), func() string { return "test-model" })

	missingID := "00000000-0000-0000-0000-000000000000"
	_, _, err := svc.SendMessage(context.Background(), &missingID, "test", nil)
	if err == nil {
		t.Fatal("expected error for non-existent conversation")
	}
	if !apperror.IsNotFound(err) {
		t.Errorf("expected NotFound error, got: %v", err)
	}
}

func TestPersistAssistantMessage(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	mock := newMockStreamer("Hello!")
	svc := service.NewChatService(testQueries, mock, func() string { return "test-model" })

	convID, stream, err := svc.SendMessage(context.Background(), nil, "Hi", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for range stream {
	}

	err = svc.PersistAssistantMessage(context.Background(), convID, "Hello! How can I help?")
	if err != nil {
		t.Fatalf("unexpected error persisting: %v", err)
	}

	// Verify message was saved by getting the conversation
	_, msgs, err := svc.GetConversation(context.Background(), convID)
	if err != nil {
		t.Fatalf("unexpected error getting conversation: %v", err)
	}

	found := false
	for _, m := range msgs {
		if m.Role == "assistant" && m.Content == "Hello! How can I help?" {
			found = true
		}
	}
	if !found {
		t.Error("assistant message not found in conversation")
	}
}

func TestDeleteConversation_NotFound(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewChatService(testQueries, newMockStreamer(""), func() string { return "test-model" })

	err := svc.DeleteConversation(context.Background(), "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected error for non-existent conversation")
	}
	if !apperror.IsNotFound(err) {
		t.Errorf("expected NotFound error, got: %v", err)
	}
}

func TestListConversations_DefaultLimit(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewChatService(testQueries, newMockStreamer(""), func() string { return "test-model" })

	// With limit=0, should default to 20
	convos, err := svc.ListConversations(context.Background(), 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Should return empty list (no conversations), not error
	if convos == nil {
		t.Error("expected non-nil result for empty list")
	}
}
