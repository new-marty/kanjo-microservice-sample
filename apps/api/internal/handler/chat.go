package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/internal/service"
)

// ChatHandler handles chat-related requests.
type ChatHandler struct {
	svc *service.ChatService
}

// NewChatHandler creates a new ChatHandler.
func NewChatHandler(svc *service.ChatService) *ChatHandler {
	return &ChatHandler{svc: svc}
}

// Chat handles AI assistant messages with SSE streaming.
//
//	@ID		chat
//	@Summary	Chat with AI assistant
//	@Tags		chat
//	@Accept		json
//	@Produce	text/event-stream
//	@Param		body	body	ChatRequest	true	"Chat message"
//	@Success	200		"SSE stream"
//	@Router		/api/v1/chat [post]
func (h *ChatHandler) Chat(c *gin.Context) {
	var input ChatRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	convID, stream, err := h.svc.SendMessage(c.Request.Context(), input.ConversationID, input.Message, input.Model)
	if err != nil {
		handleError(c, err)
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	// Send start event with conversation ID
	writeSSE(c.Writer, gin.H{"type": "start", "conversation_id": convID})
	c.Writer.Flush()

	var fullContent strings.Builder

	for chunk := range stream {
		if chunk.Err != nil {
			slog.Error("chat stream error", "error", chunk.Err, "conversation_id", convID)
			writeSSE(c.Writer, gin.H{"type": "error", "message": "Sorry, I encountered an error generating a response. Please try again."})
			c.Writer.Flush()
			return
		}

		if chunk.Done {
			break
		}

		fullContent.WriteString(chunk.Content)
		writeSSE(c.Writer, gin.H{"type": "token", "content": chunk.Content})
		c.Writer.Flush()
	}

	// Persist the complete assistant message
	if fullContent.Len() > 0 {
		if err := h.svc.PersistAssistantMessage(c.Request.Context(), convID, fullContent.String()); err != nil {
			slog.Error("failed to persist assistant message", "error", err)
		}
	}

	writeSSE(c.Writer, gin.H{"type": "done", "suggestions": []string{}})
	c.Writer.Flush()
}

// ListConversations returns recent chat conversations.
//
//	@ID			listConversations
//	@Summary	List conversations
//	@Tags		chat
//	@Produce	json
//	@Param		limit	query		int	false	"Number of results"	default(20)
//	@Success	200		{object}	DataWrapper{data=[]ConversationResponse}
//	@Router		/api/v1/chat/conversations [get]
func (h *ChatHandler) ListConversations(c *gin.Context) {
	limit := int32(20)
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = int32(l)
		}
	}

	convos, err := h.svc.ListConversations(c.Request.Context(), limit)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(convos, toConversationResponse)})
}

// GetConversation returns a conversation with its messages.
//
//	@ID			getConversation
//	@Summary	Get conversation
//	@Tags		chat
//	@Produce	json
//	@Param		id	path		string	true	"Conversation ID"
//	@Success	200	{object}	ConversationDetailResponse
//	@Router		/api/v1/chat/conversations/{id} [get]
func (h *ChatHandler) GetConversation(c *gin.Context) {
	id := c.Param("id")

	conv, msgs, err := h.svc.GetConversation(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, toConversationDetailResponse(conv, msgs))
}

// DeleteConversation deletes a chat conversation.
//
//	@ID			deleteConversation
//	@Summary	Delete conversation
//	@Tags		chat
//	@Produce	json
//	@Param		id	path		string	true	"Conversation ID"
//	@Success	200	{object}	StatusResponse
//	@Router		/api/v1/chat/conversations/{id} [delete]
func (h *ChatHandler) DeleteConversation(c *gin.Context) {
	id := c.Param("id")

	err := h.svc.DeleteConversation(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, StatusResponse{Status: "ok"})
}

func writeSSE(w io.Writer, event interface{}) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
}
