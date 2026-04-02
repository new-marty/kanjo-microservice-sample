-- name: ListTransactions :many
SELECT
    t.hash,
    t.raw_hash,
    t.date,
    t.description,
    t.amount,
    c.id as category_id,
    c.display_name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    m.normalized_name as merchant_name,
    m.display_name as merchant_display_name,
    m.icon as merchant_icon,
    t.account_name,
    t.is_transfer,
    t.is_recurring,
    t.reviewed,
    t.tags,
    t.category_override,
    t.notes,
    t.category_confidence,
    t.created_at
FROM kanjo.transactions t
LEFT JOIN kanjo.categories c ON t.category_id = c.id
LEFT JOIN kanjo.merchants m ON t.merchant_id = m.id
WHERE
    ($3::TEXT IS NULL OR t.description ILIKE '%' || $3 || '%')
    AND ($4::TEXT[] IS NULL OR t.category_id = ANY($4))
    AND ($5::DATE IS NULL OR t.date >= $5)
    AND ($6::DATE IS NULL OR t.date <= $6)
    AND (sqlc.narg('reviewed')::BOOLEAN IS NULL OR t.reviewed = sqlc.narg('reviewed'))
ORDER BY t.date DESC, t.created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountTransactions :one
SELECT COUNT(*)
FROM kanjo.transactions t
WHERE
    ($1::TEXT IS NULL OR t.description ILIKE '%' || $1 || '%')
    AND ($2::TEXT[] IS NULL OR t.category_id = ANY($2))
    AND ($3::DATE IS NULL OR t.date >= $3)
    AND ($4::DATE IS NULL OR t.date <= $4)
    AND (sqlc.narg('reviewed')::BOOLEAN IS NULL OR t.reviewed = sqlc.narg('reviewed'));

-- name: GetTransactionByHash :one
SELECT
    t.hash,
    t.raw_hash,
    t.date,
    t.description,
    t.amount,
    c.id as category_id,
    c.display_name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    m.normalized_name as merchant_name,
    m.display_name as merchant_display_name,
    m.icon as merchant_icon,
    t.account_name,
    t.is_transfer,
    t.is_recurring,
    t.reviewed,
    t.tags,
    t.category_override,
    t.notes,
    t.category_confidence,
    t.created_at
FROM kanjo.transactions t
LEFT JOIN kanjo.categories c ON t.category_id = c.id
LEFT JOIN kanjo.merchants m ON t.merchant_id = m.id
WHERE t.hash = $1;

-- name: UpdateTransactionMetadata :exec
UPDATE kanjo.transactions
SET
    reviewed = $2,
    tags = $3,
    category_override = $4,
    notes = $5,
    updated_at = NOW()
WHERE hash = $1;

-- name: GetRecentTransactions :many
SELECT
    t.hash,
    t.date,
    t.description,
    t.amount,
    c.display_name as category_name,
    t.account_name,
    t.reviewed
FROM kanjo.transactions t
LEFT JOIN kanjo.categories c ON t.category_id = c.id
ORDER BY t.date DESC, t.created_at DESC
LIMIT $1;

-- name: ListCategories :many
SELECT id, mf_category, display_name, icon, color, is_income, sort_order
FROM kanjo.categories
ORDER BY sort_order, display_name;
