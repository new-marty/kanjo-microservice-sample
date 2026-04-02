-- name: ListBudgetCategories :many
SELECT * FROM kanjo.budget_categories
ORDER BY category_name;

-- name: GetBudgetCategory :one
SELECT * FROM kanjo.budget_categories
WHERE category_name = $1;

-- name: UpsertBudgetCategory :exec
INSERT INTO kanjo.budget_categories (category_name, monthly_budget, rollover_enabled, color, updated_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (category_name) DO UPDATE SET
    monthly_budget = EXCLUDED.monthly_budget,
    rollover_enabled = EXCLUDED.rollover_enabled,
    color = EXCLUDED.color,
    updated_at = NOW();

-- name: DeleteBudgetCategory :exec
DELETE FROM kanjo.budget_categories
WHERE category_name = $1;

-- name: GetBudgetPeriod :one
SELECT * FROM kanjo.budget_periods
WHERE category_name = $1 AND period = $2;

-- name: ListBudgetPeriods :many
SELECT * FROM kanjo.budget_periods
WHERE category_name = $1
ORDER BY period DESC
LIMIT $2;

-- name: UpsertBudgetPeriod :exec
INSERT INTO kanjo.budget_periods (category_name, period, budget, rollover, spent, updated_at)
VALUES ($1, $2, $3, $4, $5, NOW())
ON CONFLICT (category_name, period) DO UPDATE SET
    budget = EXCLUDED.budget,
    rollover = EXCLUDED.rollover,
    spent = EXCLUDED.spent,
    updated_at = NOW();
