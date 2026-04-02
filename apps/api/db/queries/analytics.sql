-- name: GetNetWorth :one
SELECT COALESCE(SUM(balance), 0)::BIGINT as total
FROM kanjo.daily_assets
WHERE date = (SELECT MAX(date) FROM kanjo.daily_assets);

-- name: GetNetWorthHistory :many
SELECT
    date,
    SUM(balance)::BIGINT as total
FROM kanjo.daily_assets
WHERE date >= $1
GROUP BY date
ORDER BY date;

-- name: GetMonthlySummary :one
SELECT
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::BIGINT as income,
    COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0)::BIGINT as expenses,
    COALESCE(SUM(amount), 0)::BIGINT as net
FROM kanjo.transactions
WHERE
    date >= DATE_TRUNC('month', CURRENT_DATE)
    AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    AND is_transfer = FALSE;

-- name: GetSpendingPace :many
SELECT
    EXTRACT(DAY FROM date)::INTEGER as day_of_month,
    SUM(ABS(amount))::BIGINT as cumulative_spending
FROM kanjo.transactions
WHERE
    date >= DATE_TRUNC('month', CURRENT_DATE)
    AND date <= CURRENT_DATE
    AND amount < 0
    AND is_transfer = FALSE
GROUP BY EXTRACT(DAY FROM date)
ORDER BY day_of_month;

-- name: GetCategoryBudgets :many
SELECT
    bc.category_name,
    bc.monthly_budget,
    bc.rollover_enabled,
    bc.color,
    COALESCE(bp.rollover, 0) as rollover,
    COALESCE((
        SELECT ABS(SUM(t.amount))
        FROM kanjo.transactions t
        LEFT JOIN kanjo.categories c ON t.category_id = c.id
        WHERE
            c.display_name = bc.category_name
            AND t.date >= DATE_TRUNC('month', CURRENT_DATE)
            AND t.date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
            AND t.amount < 0
            AND t.is_transfer = FALSE
    ), 0)::BIGINT as spent
FROM kanjo.budget_categories bc
LEFT JOIN kanjo.budget_periods bp ON
    bc.category_name = bp.category_name
    AND bp.period = DATE_TRUNC('month', CURRENT_DATE)::DATE
ORDER BY bc.category_name;

-- name: SpendingByCategory :many
SELECT
    c.id as category_id,
    c.display_name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    ABS(SUM(t.amount))::BIGINT as total_amount,
    COUNT(*)::INTEGER as transaction_count
FROM kanjo.transactions t
JOIN kanjo.categories c ON t.category_id = c.id
WHERE t.date >= $1 AND t.date <= $2
    AND t.amount < 0
    AND t.is_transfer = FALSE
GROUP BY c.id, c.display_name, c.icon, c.color
ORDER BY total_amount DESC;

-- name: MonthlyTrend :many
SELECT
    DATE_TRUNC('month', date)::DATE as month,
    ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END))::BIGINT as total_spending,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)::BIGINT as total_income,
    COUNT(*)::INTEGER as transaction_count
FROM kanjo.transactions
WHERE date >= $1 AND date <= $2
    AND is_transfer = FALSE
GROUP BY DATE_TRUNC('month', date)
ORDER BY month;

-- name: GetAssetComposition :many
SELECT
    asset_type,
    SUM(balance)::BIGINT as total
FROM kanjo.daily_assets
WHERE date = (SELECT MAX(date) FROM kanjo.daily_assets)
GROUP BY asset_type
ORDER BY total DESC;

-- name: GetAssetTrend :many
SELECT
    date,
    asset_type,
    SUM(balance)::BIGINT as total
FROM kanjo.daily_assets
WHERE date >= $1
GROUP BY date, asset_type
ORDER BY date, asset_type;

-- name: GetDailyRankings :many
SELECT
    a.institution_name,
    a.account_name,
    a.asset_type,
    a.balance as current_balance,
    COALESCE(p.balance, a.balance) as previous_balance,
    (a.balance - COALESCE(p.balance, a.balance))::BIGINT as change
FROM kanjo.daily_assets a
LEFT JOIN kanjo.daily_assets p ON
    a.institution_name = p.institution_name
    AND a.account_name = p.account_name
    AND a.asset_type = p.asset_type
    AND p.date = (SELECT MAX(date) FROM kanjo.daily_assets WHERE date < (SELECT MAX(date) FROM kanjo.daily_assets))
WHERE a.date = (SELECT MAX(date) FROM kanjo.daily_assets)
ORDER BY ABS(a.balance - COALESCE(p.balance, a.balance)) DESC
LIMIT $1;

-- name: GetCashFlow :many
SELECT
    DATE_TRUNC('month', date)::DATE as month,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)::BIGINT as income,
    ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END))::BIGINT as expenses
FROM kanjo.transactions
WHERE
    date >= $1
    AND date <= $2
    AND is_transfer = FALSE
GROUP BY DATE_TRUNC('month', date)
ORDER BY month;
