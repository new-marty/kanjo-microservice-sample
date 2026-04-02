package service

import (
	"context"

	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/repository"
)

// BudgetService handles business logic for budgets.
type BudgetService struct {
	queries *repository.Queries
}

// NewBudgetService creates a new BudgetService.
func NewBudgetService(queries *repository.Queries) *BudgetService {
	return &BudgetService{queries: queries}
}

// BudgetWithProgress represents a budget category with current progress.
type BudgetWithProgress struct {
	CategoryName    string `json:"category_name"`
	MonthlyBudget   int64  `json:"monthly_budget"`
	RolloverEnabled bool   `json:"rollover_enabled"`
	Color           string `json:"color"`
	Rollover        int64  `json:"rollover"`
	Spent           int64  `json:"spent"`
}

// List returns all budget categories with current progress.
func (s *BudgetService) List(ctx context.Context) ([]BudgetWithProgress, error) {
	budgets, err := s.queries.GetCategoryBudgets(ctx)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to list budgets", err)
	}

	result := make([]BudgetWithProgress, len(budgets))
	for i, b := range budgets {
		result[i] = BudgetWithProgress{
			CategoryName:    b.CategoryName,
			MonthlyBudget:   b.MonthlyBudget,
			RolloverEnabled: b.RolloverEnabled,
			Color:           b.Color,
			Rollover:        b.Rollover,
			Spent:           b.Spent,
		}
	}

	return result, nil
}

// UpsertInput contains input for creating/updating a budget.
type UpsertInput struct {
	CategoryName    string
	MonthlyBudget   int64
	RolloverEnabled bool
	Color           string
}

// Upsert creates or updates a budget category.
func (s *BudgetService) Upsert(ctx context.Context, input UpsertInput) error {
	fields := make(map[string]string)
	if input.CategoryName == "" {
		fields["category_name"] = "required"
	}
	if input.MonthlyBudget < 0 {
		fields["monthly_budget"] = "must be non-negative"
	}
	if len(fields) > 0 {
		return apperror.InvalidInputFields(fields)
	}
	if input.Color == "" {
		input.Color = "#6B7280"
	}

	err := s.queries.UpsertBudgetCategory(ctx, repository.UpsertBudgetCategoryParams{
		CategoryName:    input.CategoryName,
		MonthlyBudget:   input.MonthlyBudget,
		RolloverEnabled: input.RolloverEnabled,
		Color:           input.Color,
	})
	if err != nil {
		return apperror.InternalWithErr("failed to upsert budget", err)
	}

	return nil
}

// GetPeriods returns budget history for a category.
func (s *BudgetService) GetPeriods(ctx context.Context, categoryName string, limit int32) ([]repository.KanjoBudgetPeriod, error) {
	if limit <= 0 {
		limit = 12
	}

	periods, err := s.queries.ListBudgetPeriods(ctx, repository.ListBudgetPeriodsParams{
		CategoryName: categoryName,
		Limit:        limit,
	})
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get budget periods", err)
	}

	return periods, nil
}

// Delete removes a budget category.
func (s *BudgetService) Delete(ctx context.Context, categoryName string) error {
	err := s.queries.DeleteBudgetCategory(ctx, categoryName)
	if err != nil {
		return apperror.InternalWithErr("failed to delete budget", err)
	}
	return nil
}
