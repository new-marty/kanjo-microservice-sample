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

// GoalService handles business logic for savings goals.
type GoalService struct {
	queries *repository.Queries
}

// NewGoalService creates a new GoalService.
func NewGoalService(queries *repository.Queries) *GoalService {
	return &GoalService{queries: queries}
}

// List returns active goals with progress.
func (s *GoalService) List(ctx context.Context) ([]repository.KanjoSavingsGoal, error) {
	goals, err := s.queries.ListGoals(ctx)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to list goals", err)
	}
	return goals, nil
}

// CreateInput contains input for creating a goal.
type CreateInput struct {
	Name          string
	TargetAmount  int64
	CurrentAmount int64
	Deadline      *time.Time
	Icon          string
	Color         string
}

// Create creates a new savings goal.
func (s *GoalService) Create(ctx context.Context, input CreateInput) (*repository.KanjoSavingsGoal, error) {
	fields := make(map[string]string)
	if input.Name == "" {
		fields["name"] = "required"
	}
	if input.TargetAmount <= 0 {
		fields["target_amount"] = "must be positive"
	}
	if len(fields) > 0 {
		return nil, apperror.InvalidInputFields(fields)
	}
	if input.Icon == "" {
		input.Icon = "🎯"
	}
	if input.Color == "" {
		input.Color = "#0891B2"
	}

	params := repository.CreateGoalParams{
		Name:          input.Name,
		TargetAmount:  input.TargetAmount,
		CurrentAmount: input.CurrentAmount,
		Icon:          input.Icon,
		Color:         input.Color,
	}

	if input.Deadline != nil {
		params.Deadline = pgtype.Date{
			Time:  *input.Deadline,
			Valid: true,
		}
	}

	goal, err := s.queries.CreateGoal(ctx, params)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to create goal", err)
	}

	return &goal, nil
}

// UpdateInput contains input for updating a goal.
type UpdateInput struct {
	Name          *string
	TargetAmount  *int64
	CurrentAmount *int64
	Deadline      *time.Time
	Icon          *string
	Color         *string
	Archived      *bool
}

// Update modifies a savings goal.
func (s *GoalService) Update(ctx context.Context, id int64, input UpdateInput) error {
	// First verify goal exists
	_, err := s.queries.GetGoal(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.NotFound("goal")
		}
		return apperror.InternalWithErr("failed to get goal", err)
	}

	params := repository.UpdateGoalParams{ID: id}

	if input.Name != nil {
		params.Name = pgtype.Text{String: *input.Name, Valid: true}
	}
	if input.TargetAmount != nil {
		params.TargetAmount = pgtype.Int8{Int64: *input.TargetAmount, Valid: true}
	}
	if input.CurrentAmount != nil {
		params.CurrentAmount = pgtype.Int8{Int64: *input.CurrentAmount, Valid: true}
	}
	if input.Deadline != nil {
		params.Deadline = pgtype.Date{Time: *input.Deadline, Valid: true}
	}
	if input.Icon != nil {
		params.Icon = pgtype.Text{String: *input.Icon, Valid: true}
	}
	if input.Color != nil {
		params.Color = pgtype.Text{String: *input.Color, Valid: true}
	}
	if input.Archived != nil {
		params.Archived = pgtype.Bool{Bool: *input.Archived, Valid: true}
	}

	err = s.queries.UpdateGoal(ctx, params)
	if err != nil {
		return apperror.InternalWithErr("failed to update goal", err)
	}

	return nil
}

// Delete removes a savings goal.
func (s *GoalService) Delete(ctx context.Context, id int64) error {
	// First verify goal exists
	_, err := s.queries.GetGoal(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.NotFound("goal")
		}
		return apperror.InternalWithErr("failed to get goal", err)
	}

	err = s.queries.DeleteGoal(ctx, id)
	if err != nil {
		return apperror.InternalWithErr("failed to delete goal", err)
	}

	return nil
}

// Get returns a single goal by ID.
func (s *GoalService) Get(ctx context.Context, id int64) (*repository.KanjoSavingsGoal, error) {
	goal, err := s.queries.GetGoal(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("goal")
		}
		return nil, apperror.InternalWithErr("failed to get goal", err)
	}
	return &goal, nil
}
