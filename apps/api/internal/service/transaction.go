package service

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/repository"
)

// TransactionService handles business logic for transactions.
type TransactionService struct {
	queries *repository.Queries
}

// NewTransactionService creates a new TransactionService.
func NewTransactionService(queries *repository.Queries) *TransactionService {
	return &TransactionService{queries: queries}
}

// ListParams contains parameters for listing transactions.
type ListParams struct {
	Limit      int32
	Offset     int32
	Search     *string
	Categories []string
	DateFrom   *time.Time
	DateTo     *time.Time
	Reviewed   *bool
}

// TransactionListResult contains the result of listing transactions.
type TransactionListResult struct {
	Data  []repository.ListTransactionsRow
	Total int64
}

// List returns transactions with optional filters and pagination.
func (s *TransactionService) List(ctx context.Context, params ListParams) (*TransactionListResult, error) {
	// Build query params
	listParams := repository.ListTransactionsParams{
		Limit:  params.Limit,
		Offset: params.Offset,
	}

	if params.Search != nil {
		listParams.Column3 = *params.Search
	}

	if len(params.Categories) > 0 {
		listParams.Column4 = params.Categories
	}

	if params.DateFrom != nil {
		listParams.Column5 = pgtype.Date{
			Time:  *params.DateFrom,
			Valid: true,
		}
	}

	if params.DateTo != nil {
		listParams.Column6 = pgtype.Date{
			Time:  *params.DateTo,
			Valid: true,
		}
	}

	if params.Reviewed != nil {
		listParams.Reviewed = pgtype.Bool{Bool: *params.Reviewed, Valid: true}
	}

	// Get transactions
	transactions, err := s.queries.ListTransactions(ctx, listParams)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to list transactions", err)
	}

	// Get total count
	countParams := repository.CountTransactionsParams{}
	if params.Search != nil {
		countParams.Column1 = *params.Search
	}
	if len(params.Categories) > 0 {
		countParams.Column2 = params.Categories
	}
	if params.DateFrom != nil {
		countParams.Column3 = pgtype.Date{
			Time:  *params.DateFrom,
			Valid: true,
		}
	}
	if params.DateTo != nil {
		countParams.Column4 = pgtype.Date{
			Time:  *params.DateTo,
			Valid: true,
		}
	}
	if params.Reviewed != nil {
		countParams.Reviewed = pgtype.Bool{Bool: *params.Reviewed, Valid: true}
	}

	total, err := s.queries.CountTransactions(ctx, countParams)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to count transactions", err)
	}

	return &TransactionListResult{
		Data:  transactions,
		Total: total,
	}, nil
}

// GetByHash returns a single transaction by hash.
func (s *TransactionService) GetByHash(ctx context.Context, hash string) (*repository.GetTransactionByHashRow, error) {
	tx, err := s.queries.GetTransactionByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("transaction")
		}
		return nil, apperror.InternalWithErr("failed to get transaction", err)
	}
	return &tx, nil
}

// UpdateMetadataInput contains input for updating transaction metadata.
type UpdateMetadataInput struct {
	Reviewed         *bool
	Tags             []string
	CategoryOverride *string
	Notes            *string
}

// UpdateMetadata updates transaction metadata.
func (s *TransactionService) UpdateMetadata(ctx context.Context, hash string, input UpdateMetadataInput) error {
	// First verify transaction exists
	existing, err := s.queries.GetTransactionByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.NotFound("transaction")
		}
		return apperror.InternalWithErr("failed to get transaction", err)
	}

	// Build update params
	params := repository.UpdateTransactionMetadataParams{
		Hash:     hash,
		Reviewed: existing.Reviewed,
		Tags:     existing.Tags,
	}

	if input.Reviewed != nil {
		params.Reviewed = *input.Reviewed
	}

	if input.Tags != nil {
		params.Tags = input.Tags
	}

	if input.CategoryOverride != nil {
		params.CategoryOverride = pgtype.Text{
			String: *input.CategoryOverride,
			Valid:  true,
		}
	} else {
		params.CategoryOverride = existing.CategoryOverride
	}

	if input.Notes != nil {
		params.Notes = pgtype.Text{
			String: *input.Notes,
			Valid:  true,
		}
	} else {
		params.Notes = existing.Notes
	}

	if err := s.queries.UpdateTransactionMetadata(ctx, params); err != nil {
		return apperror.InternalWithErr("failed to update transaction", err)
	}

	return nil
}

// GetRecent returns recent transactions.
func (s *TransactionService) GetRecent(ctx context.Context, limit int32) ([]repository.GetRecentTransactionsRow, error) {
	transactions, err := s.queries.GetRecentTransactions(ctx, limit)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get recent transactions", err)
	}
	return transactions, nil
}
