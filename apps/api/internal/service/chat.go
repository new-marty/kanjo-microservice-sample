package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/llm"
	"github.com/new-marty/kanjo/internal/repository"
)

// ModelProvider returns the current default model name.
type ModelProvider func() string

// ChatService handles AI chat business logic.
type ChatService struct {
	queries       *repository.Queries
	llmClient     llm.Streamer
	modelProvider ModelProvider
}

// NewChatService creates a new ChatService.
func NewChatService(queries *repository.Queries, llmClient llm.Streamer, modelProvider ModelProvider) *ChatService {
	return &ChatService{
		queries:       queries,
		llmClient:     llmClient,
		modelProvider: modelProvider,
	}
}

// SendMessage sends a user message and returns the conversation ID and a streaming response channel.
func (s *ChatService) SendMessage(ctx context.Context, conversationID *string, userMessage string, model *string) (string, <-chan llm.StreamChunk, error) {
	selectedModel := s.modelProvider()
	if model != nil && *model != "" {
		selectedModel = *model
	}

	var convUUID pgtype.UUID
	var conv repository.KanjoChatConversation

	if conversationID != nil && *conversationID != "" {
		if err := convUUID.Scan(*conversationID); err != nil {
			return "", nil, apperror.InvalidInput("invalid conversation_id")
		}
		var err error
		conv, err = s.queries.GetConversation(ctx, convUUID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return "", nil, apperror.NotFound("conversation")
			}
			return "", nil, apperror.InternalWithErr("failed to get conversation", err)
		}
	} else {
		// Truncate message as title
		title := userMessage
		if len(title) > 50 {
			title = title[:50] + "..."
		}
		var err error
		conv, err = s.queries.CreateConversation(ctx, repository.CreateConversationParams{
			Title: title,
			Model: selectedModel,
		})
		if err != nil {
			return "", nil, apperror.InternalWithErr("failed to create conversation", err)
		}
		convUUID = conv.ID
	}

	// Persist user message
	_, err := s.queries.CreateChatMessage(ctx, repository.CreateChatMessageParams{
		ConversationID: convUUID,
		Role:           "user",
		Content:        userMessage,
	})
	if err != nil {
		return "", nil, apperror.InternalWithErr("failed to save user message", err)
	}

	// Touch conversation updated_at
	_ = s.queries.TouchConversation(ctx, convUUID)

	// Build message history
	history, err := s.queries.ListChatMessages(ctx, convUUID)
	if err != nil {
		return "", nil, apperror.InternalWithErr("failed to load chat history", err)
	}

	// Build system prompt with financial context
	systemPrompt := buildSystemPrompt(ctx, s.queries)

	messages := []llm.Message{{Role: "system", Content: systemPrompt}}
	for _, m := range history {
		if m.Role == "system" {
			continue
		}
		messages = append(messages, llm.Message{Role: m.Role, Content: m.Content})
	}

	// Format conversation ID as string
	convIDStr := fmt.Sprintf("%x-%x-%x-%x-%x",
		conv.ID.Bytes[0:4], conv.ID.Bytes[4:6], conv.ID.Bytes[6:8],
		conv.ID.Bytes[8:10], conv.ID.Bytes[10:16])

	ch := s.llmClient.StreamChat(ctx, selectedModel, messages)
	return convIDStr, ch, nil
}

// PersistAssistantMessage saves the completed assistant response.
func (s *ChatService) PersistAssistantMessage(ctx context.Context, conversationID string, content string) error {
	var convUUID pgtype.UUID
	if err := convUUID.Scan(conversationID); err != nil {
		return apperror.InvalidInput("invalid conversation_id")
	}

	_, err := s.queries.CreateChatMessage(ctx, repository.CreateChatMessageParams{
		ConversationID: convUUID,
		Role:           "assistant",
		Content:        content,
	})
	if err != nil {
		return apperror.InternalWithErr("failed to save assistant message", err)
	}

	_ = s.queries.TouchConversation(ctx, convUUID)
	return nil
}

// ListConversations returns recent conversations.
func (s *ChatService) ListConversations(ctx context.Context, limit int32) ([]repository.KanjoChatConversation, error) {
	if limit <= 0 {
		limit = 20
	}
	convos, err := s.queries.ListConversations(ctx, limit)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to list conversations", err)
	}
	return convos, nil
}

// GetConversation returns a conversation with its messages.
func (s *ChatService) GetConversation(ctx context.Context, id string) (*repository.KanjoChatConversation, []repository.KanjoChatMessage, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(id); err != nil {
		return nil, nil, apperror.InvalidInput("invalid conversation id")
	}

	conv, err := s.queries.GetConversation(ctx, uuid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, apperror.NotFound("conversation")
		}
		return nil, nil, apperror.InternalWithErr("failed to get conversation", err)
	}

	msgs, err := s.queries.ListChatMessages(ctx, uuid)
	if err != nil {
		return nil, nil, apperror.InternalWithErr("failed to list messages", err)
	}

	return &conv, msgs, nil
}

// DeleteConversation deletes a conversation and its messages.
func (s *ChatService) DeleteConversation(ctx context.Context, id string) error {
	var uuid pgtype.UUID
	if err := uuid.Scan(id); err != nil {
		return apperror.InvalidInput("invalid conversation id")
	}

	// Verify it exists
	_, err := s.queries.GetConversation(ctx, uuid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.NotFound("conversation")
		}
		return apperror.InternalWithErr("failed to get conversation", err)
	}

	err = s.queries.DeleteConversation(ctx, uuid)
	if err != nil {
		return apperror.InternalWithErr("failed to delete conversation", err)
	}
	return nil
}
