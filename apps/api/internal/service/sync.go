package service

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/new-marty/kanjo/internal/repository"
)

// SyncStatus holds the result of the last sync.
type SyncStatus struct {
	LastSyncAt              *string
	TransactionsProcessed   int32
	TransactionsTransformed int32
}

// SyncService provides sync status operations.
type SyncService struct {
	queries *repository.Queries
}

// NewSyncService creates a new SyncService.
func NewSyncService(queries *repository.Queries) *SyncService {
	return &SyncService{queries: queries}
}

// GetStatus returns the last completed sync status.
func (s *SyncService) GetStatus(ctx context.Context) (*SyncStatus, error) {
	row, err := s.queries.GetLastSyncStatus(ctx)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &SyncStatus{}, nil
		}
		return nil, err
	}

	status := &SyncStatus{
		TransactionsProcessed:   row.TransactionsProcessed.Int32,
		TransactionsTransformed: row.TransactionsTransformed.Int32,
	}

	if row.CompletedAt.Valid {
		t := row.CompletedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		status.LastSyncAt = &t
	}

	return status, nil
}
