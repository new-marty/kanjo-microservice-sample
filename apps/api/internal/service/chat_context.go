package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/new-marty/kanjo/internal/repository"
)

func buildSystemPrompt(ctx context.Context, queries *repository.Queries) string {
	var parts []string

	parts = append(parts, `You are a helpful personal finance assistant for a Japanese household finance app called Kanjo. You have access to the user's financial data. Answer questions concisely and helpfully. Respond in the same language the user writes in. Use yen (¥) for currency formatting.`)

	// Fetch current month summary
	summary, err := queries.GetMonthlySummary(ctx)
	if err != nil {
		slog.Warn("chat context: failed to get monthly summary", "error", err)
	} else {
		parts = append(parts, fmt.Sprintf(
			"Current month financial summary: Income ¥%d, Expenses ¥%d, Net savings ¥%d.",
			summary.Income, summary.Expenses, summary.Net,
		))
	}

	// Fetch net worth
	netWorth, err := queries.GetNetWorth(ctx)
	if err != nil {
		slog.Warn("chat context: failed to get net worth", "error", err)
	} else {
		parts = append(parts, fmt.Sprintf("Current net worth: ¥%d.", netWorth))
	}

	// Fetch budget status
	budgets, err := queries.GetCategoryBudgets(ctx)
	if err != nil {
		slog.Warn("chat context: failed to get budgets", "error", err)
	} else if len(budgets) > 0 {
		var budgetLines []string
		for _, b := range budgets {
			budgetLines = append(budgetLines, fmt.Sprintf("  %s: budget ¥%d, spent ¥%d", b.CategoryName, b.MonthlyBudget, b.Spent))
		}
		parts = append(parts, "Budget status:\n"+strings.Join(budgetLines, "\n"))
	}

	return strings.Join(parts, "\n\n")
}
