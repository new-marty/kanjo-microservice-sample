package service

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/repository"
)

// InsightService handles business logic for AI insights.
type InsightService struct {
	queries *repository.Queries
}

// NewInsightService creates a new InsightService.
func NewInsightService(queries *repository.Queries) *InsightService {
	return &InsightService{queries: queries}
}

// List returns active insights.
func (s *InsightService) List(ctx context.Context, limit int32) ([]repository.KanjoInsight, error) {
	if limit <= 0 {
		limit = 10
	}

	insights, err := s.queries.ListInsights(ctx, limit)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to list insights", err)
	}

	return insights, nil
}

// Dismiss marks an insight as dismissed.
func (s *InsightService) Dismiss(ctx context.Context, id int64) error {
	// First verify insight exists
	_, err := s.queries.GetInsight(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.NotFound("insight")
		}
		return apperror.InternalWithErr("failed to get insight", err)
	}

	err = s.queries.DismissInsight(ctx, id)
	if err != nil {
		return apperror.InternalWithErr("failed to dismiss insight", err)
	}

	return nil
}

// Get returns a single insight by ID.
func (s *InsightService) Get(ctx context.Context, id int64) (*repository.KanjoInsight, error) {
	insight, err := s.queries.GetInsight(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("insight")
		}
		return nil, apperror.InternalWithErr("failed to get insight", err)
	}
	return &insight, nil
}
