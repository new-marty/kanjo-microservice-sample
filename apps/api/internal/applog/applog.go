package applog

import (
	"context"
	"log/slog"

	"github.com/new-marty/kanjo/internal/middleware"
)

// Logger returns an slog.Logger enriched with the request_id from context.
func Logger(ctx context.Context) *slog.Logger {
	logger := slog.Default()
	if id := middleware.RequestIDFromContext(ctx); id != "" {
		logger = logger.With("request_id", id)
	}
	return logger
}
