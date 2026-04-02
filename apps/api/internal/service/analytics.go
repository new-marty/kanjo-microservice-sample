package service

import (
	"context"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/repository"
)

// AnalyticsService handles business logic for analytics.
type AnalyticsService struct {
	queries *repository.Queries
}

// NewAnalyticsService creates a new AnalyticsService.
func NewAnalyticsService(queries *repository.Queries) *AnalyticsService {
	return &AnalyticsService{queries: queries}
}

// DashboardData contains all dashboard data.
type DashboardData struct {
	NetWorth           NetWorthData                          `json:"net_worth"`
	MonthlySummary     MonthlySummaryData                    `json:"monthly_summary"`
	SpendingPace       SpendingPaceData                      `json:"spending_pace"`
	CategoryBudgets    []repository.GetCategoryBudgetsRow    `json:"category_budgets"`
	RecentTransactions []repository.GetRecentTransactionsRow `json:"recent_transactions"`
}

// NetWorthData contains net worth data.
type NetWorthData struct {
	Current       int64                              `json:"current"`
	PreviousMonth int64                              `json:"previous_month"`
	History       []repository.GetNetWorthHistoryRow `json:"history"`
}

// MonthlySummaryData contains monthly summary data.
type MonthlySummaryData struct {
	Income      int64   `json:"income"`
	Expenses    int64   `json:"expenses"`
	Saved       int64   `json:"saved"`
	SavingsRate float64 `json:"savings_rate"`
}

// SpendingPaceData contains spending pace data.
type SpendingPaceData struct {
	DaysInMonth    int                             `json:"days_in_month"`
	DayOfMonth     int                             `json:"day_of_month"`
	Budget         int64                           `json:"budget"`
	ActualSpending []repository.GetSpendingPaceRow `json:"actual_spending"`
}

// GetDashboard returns all dashboard data in a single request.
func (s *AnalyticsService) GetDashboard(ctx context.Context) (*DashboardData, error) {
	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstErr error

	data := &DashboardData{}
	now := time.Now()

	// Run queries in parallel
	wg.Add(6)

	// Get net worth
	go func() {
		defer wg.Done()
		netWorth, err := s.queries.GetNetWorth(ctx)
		if err != nil {
			mu.Lock()
			if firstErr == nil {
				firstErr = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		data.NetWorth.Current = netWorth
		mu.Unlock()
	}()

	// Get net worth history (last 12 months)
	go func() {
		defer wg.Done()
		since := now.AddDate(0, -12, 0)
		history, err := s.queries.GetNetWorthHistory(ctx, pgtype.Date{
			Time:  since,
			Valid: true,
		})
		if err != nil {
			mu.Lock()
			if firstErr == nil {
				firstErr = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		data.NetWorth.History = history
		// Calculate previous month from history
		if len(history) > 1 {
			data.NetWorth.PreviousMonth = history[len(history)-2].Total
		}
		mu.Unlock()
	}()

	// Get monthly summary
	go func() {
		defer wg.Done()
		summary, err := s.queries.GetMonthlySummary(ctx)
		if err != nil {
			mu.Lock()
			if firstErr == nil {
				firstErr = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		data.MonthlySummary.Income = summary.Income
		data.MonthlySummary.Expenses = summary.Expenses
		data.MonthlySummary.Saved = summary.Net
		if summary.Income > 0 {
			data.MonthlySummary.SavingsRate = float64(summary.Net) / float64(summary.Income) * 100
		}
		mu.Unlock()
	}()

	// Get spending pace
	go func() {
		defer wg.Done()
		pace, err := s.queries.GetSpendingPace(ctx)
		if err != nil {
			mu.Lock()
			if firstErr == nil {
				firstErr = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		data.SpendingPace.ActualSpending = pace
		data.SpendingPace.DayOfMonth = now.Day()
		data.SpendingPace.DaysInMonth = daysInMonth(now)
		mu.Unlock()
	}()

	// Get category budgets
	go func() {
		defer wg.Done()
		budgets, err := s.queries.GetCategoryBudgets(ctx)
		if err != nil {
			mu.Lock()
			if firstErr == nil {
				firstErr = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		data.CategoryBudgets = budgets
		// Calculate total budget for spending pace
		var totalBudget int64
		for _, b := range budgets {
			totalBudget += b.MonthlyBudget
		}
		data.SpendingPace.Budget = totalBudget
		mu.Unlock()
	}()

	// Get recent transactions
	go func() {
		defer wg.Done()
		transactions, err := s.queries.GetRecentTransactions(ctx, 5)
		if err != nil {
			mu.Lock()
			if firstErr == nil {
				firstErr = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		data.RecentTransactions = transactions
		mu.Unlock()
	}()

	wg.Wait()

	if firstErr != nil {
		return nil, apperror.InternalWithErr("failed to get dashboard data", firstErr)
	}

	return data, nil
}

// GetNetWorth returns current net worth and history.
func (s *AnalyticsService) GetNetWorth(ctx context.Context, months int) (*NetWorthData, error) {
	if months <= 0 {
		months = 12
	}

	current, err := s.queries.GetNetWorth(ctx)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get net worth", err)
	}

	since := time.Now().AddDate(0, -months, 0)
	history, err := s.queries.GetNetWorthHistory(ctx, pgtype.Date{
		Time:  since,
		Valid: true,
	})
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get net worth history", err)
	}

	var previousMonth int64
	if len(history) > 1 {
		previousMonth = history[len(history)-2].Total
	}

	return &NetWorthData{
		Current:       current,
		PreviousMonth: previousMonth,
		History:       history,
	}, nil
}

// GetMonthlySummary returns income/expense summary for current month.
func (s *AnalyticsService) GetMonthlySummary(ctx context.Context) (*MonthlySummaryData, error) {
	summary, err := s.queries.GetMonthlySummary(ctx)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get monthly summary", err)
	}

	var savingsRate float64
	if summary.Income > 0 {
		savingsRate = float64(summary.Net) / float64(summary.Income) * 100
	}

	return &MonthlySummaryData{
		Income:      summary.Income,
		Expenses:    summary.Expenses,
		Saved:       summary.Net,
		SavingsRate: savingsRate,
	}, nil
}

// GetSpendingPace returns cumulative spending for current month.
func (s *AnalyticsService) GetSpendingPace(ctx context.Context) (*SpendingPaceData, error) {
	pace, err := s.queries.GetSpendingPace(ctx)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get spending pace", err)
	}

	budgets, err := s.queries.GetCategoryBudgets(ctx)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get category budgets", err)
	}

	var totalBudget int64
	for _, b := range budgets {
		totalBudget += b.MonthlyBudget
	}

	now := time.Now()
	return &SpendingPaceData{
		DaysInMonth:    daysInMonth(now),
		DayOfMonth:     now.Day(),
		Budget:         totalBudget,
		ActualSpending: pace,
	}, nil
}

// GetSpendingByCategory returns spending grouped by category.
func (s *AnalyticsService) GetSpendingByCategory(ctx context.Context, from, to time.Time) ([]repository.SpendingByCategoryRow, error) {
	data, err := s.queries.SpendingByCategory(ctx, repository.SpendingByCategoryParams{
		Date:   pgtype.Date{Time: from, Valid: true},
		Date_2: pgtype.Date{Time: to, Valid: true},
	})
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get spending by category", err)
	}
	return data, nil
}

// GetCashFlow returns monthly cash flow data.
func (s *AnalyticsService) GetCashFlow(ctx context.Context, from, to time.Time) ([]repository.GetCashFlowRow, error) {
	data, err := s.queries.GetCashFlow(ctx, repository.GetCashFlowParams{
		Date:   pgtype.Date{Time: from, Valid: true},
		Date_2: pgtype.Date{Time: to, Valid: true},
	})
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get cash flow", err)
	}
	return data, nil
}

// GetAssetComposition returns asset breakdown by type.
func (s *AnalyticsService) GetAssetComposition(ctx context.Context) ([]repository.GetAssetCompositionRow, error) {
	data, err := s.queries.GetAssetComposition(ctx)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get asset composition", err)
	}
	return data, nil
}

// GetAssetTrend returns historical asset values.
func (s *AnalyticsService) GetAssetTrend(ctx context.Context, since time.Time) ([]repository.GetAssetTrendRow, error) {
	data, err := s.queries.GetAssetTrend(ctx, pgtype.Date{
		Time:  since,
		Valid: true,
	})
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get asset trend", err)
	}
	return data, nil
}

// GetDailyRankings returns top gainers/decliners.
func (s *AnalyticsService) GetDailyRankings(ctx context.Context, limit int32) ([]repository.GetDailyRankingsRow, error) {
	if limit <= 0 {
		limit = 10
	}
	data, err := s.queries.GetDailyRankings(ctx, limit)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to get daily rankings", err)
	}
	return data, nil
}

func daysInMonth(t time.Time) int {
	y, m, _ := t.Date()
	return time.Date(y, m+1, 0, 0, 0, 0, 0, t.Location()).Day()
}
