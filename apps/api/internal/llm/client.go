package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/new-marty/kanjo/internal/applog"
)

// Message represents a chat message for the LLM API.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// StreamChunk represents a single token from the streaming response.
type StreamChunk struct {
	Content string
	Done    bool
	Err     error
}

type chatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Stream   bool      `json:"stream"`
}

type chatCompletionChunk struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason *string `json:"finish_reason"`
	} `json:"choices"`
}

// KeyProvider returns the current API key. Called on each request to support dynamic key updates.
type KeyProvider func() string

// Client communicates with the OpenRouter API.
type Client struct {
	keyProvider KeyProvider
	baseURL     string
	http        *http.Client
}

// New creates a new LLM client with a dynamic key provider.
func New(keyProvider KeyProvider, baseURL string) *Client {
	return &Client{
		keyProvider: keyProvider,
		baseURL:     baseURL,
		http:        &http.Client{Timeout: 60 * time.Second},
	}
}

const maxRetries = 2

func isRetryable(statusCode int) bool {
	return statusCode == http.StatusTooManyRequests || statusCode >= 500
}

// StreamChat sends messages to the LLM and returns a channel of streaming chunks.
func (c *Client) StreamChat(ctx context.Context, model string, messages []Message) <-chan StreamChunk {
	ch := make(chan StreamChunk)

	go func() {
		defer close(ch)

		log := applog.Logger(ctx)
		log.Info("llm.StreamChat start", "model", model, "message_count", len(messages))
		start := time.Now()

		body, err := json.Marshal(chatRequest{
			Model:    model,
			Messages: messages,
			Stream:   true,
		})
		if err != nil {
			ch <- StreamChunk{Err: fmt.Errorf("marshal request: %w", err)}
			return
		}

		var resp *http.Response
		for attempt := 0; attempt <= maxRetries; attempt++ {
			if attempt > 0 {
				backoff := time.Duration(attempt) * 500 * time.Millisecond
				log.Warn("llm.StreamChat retrying", "attempt", attempt, "backoff_ms", backoff.Milliseconds())
				select {
				case <-time.After(backoff):
				case <-ctx.Done():
					ch <- StreamChunk{Err: fmt.Errorf("context cancelled during retry: %w", ctx.Err())}
					return
				}
			}

			req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
			if err != nil {
				ch <- StreamChunk{Err: fmt.Errorf("create request: %w", err)}
				return
			}

			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+c.keyProvider())
			req.Header.Set("HTTP-Referer", "kanjo-app")

			resp, err = c.http.Do(req)
			if err != nil {
				log.Error("llm.StreamChat request failed", "error", err, "attempt", attempt, "duration_ms", time.Since(start).Milliseconds())
				if attempt == maxRetries {
					ch <- StreamChunk{Err: fmt.Errorf("send request: %w", err)}
					return
				}
				continue
			}

			if resp.StatusCode == http.StatusOK {
				break
			}

			respBody, _ := io.ReadAll(resp.Body)
			_ = resp.Body.Close()
			log.Error("llm.StreamChat API error", "status", resp.StatusCode, "body", string(respBody), "attempt", attempt)

			if !isRetryable(resp.StatusCode) || attempt == maxRetries {
				ch <- StreamChunk{Err: fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))}
				return
			}
		}
		defer func() { _ = resp.Body.Close() }()

		log.Info("llm.StreamChat stream started", "time_to_first_byte_ms", time.Since(start).Milliseconds())

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()

			if !strings.HasPrefix(line, "data: ") {
				continue
			}

			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				log.Info("llm.StreamChat complete", "duration_ms", time.Since(start).Milliseconds())
				ch <- StreamChunk{Done: true}
				return
			}

			var chunk chatCompletionChunk
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				continue
			}

			if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
				ch <- StreamChunk{Content: chunk.Choices[0].Delta.Content}
			}

			if len(chunk.Choices) > 0 && chunk.Choices[0].FinishReason != nil {
				log.Info("llm.StreamChat complete", "duration_ms", time.Since(start).Milliseconds())
				ch <- StreamChunk{Done: true}
				return
			}
		}

		if err := scanner.Err(); err != nil {
			log.Error("llm.StreamChat stream read error", "error", err)
			ch <- StreamChunk{Err: fmt.Errorf("read stream: %w", err)}
		}
	}()

	return ch
}
