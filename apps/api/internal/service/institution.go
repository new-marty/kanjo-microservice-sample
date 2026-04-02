package service

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/repository"
)

// InstitutionService handles business logic for institutions.
type InstitutionService struct {
	queries *repository.Queries
}

// NewInstitutionService creates a new InstitutionService.
func NewInstitutionService(queries *repository.Queries) *InstitutionService {
	return &InstitutionService{queries: queries}
}

// List returns all institutions.
func (s *InstitutionService) List(ctx context.Context) ([]repository.ListInstitutionsRow, error) {
	institutions, err := s.queries.ListInstitutions(ctx)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to list institutions", err)
	}
	return institutions, nil
}

// UpdateInput contains input for updating an institution.
type UpdateInstitutionInput struct {
	DisplayName *string
	Icon        *string
	Color       *string
	Hidden      *bool
}

// Update updates institution display settings.
func (s *InstitutionService) Update(ctx context.Context, name string, input UpdateInstitutionInput) error {
	// First verify institution exists
	_, err := s.queries.GetInstitution(ctx, name)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.NotFound("institution")
		}
		return apperror.InternalWithErr("failed to get institution", err)
	}

	params := repository.UpsertInstitutionParams{
		InstitutionName: name,
	}

	if input.DisplayName != nil {
		params.DisplayName = pgtype.Text{
			String: *input.DisplayName,
			Valid:  true,
		}
	}
	if input.Icon != nil {
		params.Icon = pgtype.Text{
			String: *input.Icon,
			Valid:  true,
		}
	}
	if input.Color != nil {
		params.Color = pgtype.Text{
			String: *input.Color,
			Valid:  true,
		}
	}
	if input.Hidden != nil {
		params.Hidden = *input.Hidden
	}

	err = s.queries.UpsertInstitution(ctx, params)
	if err != nil {
		return apperror.InternalWithErr("failed to update institution", err)
	}

	return nil
}

// Get returns a single institution by name.
func (s *InstitutionService) Get(ctx context.Context, name string) (*repository.GetInstitutionRow, error) {
	inst, err := s.queries.GetInstitution(ctx, name)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("institution")
		}
		return nil, apperror.InternalWithErr("failed to get institution", err)
	}
	return &inst, nil
}
