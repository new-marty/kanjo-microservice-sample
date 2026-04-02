package llm

import "context"

// Streamer defines the interface for streaming chat completions.
type Streamer interface {
	StreamChat(ctx context.Context, model string, messages []Message) <-chan StreamChunk
}
