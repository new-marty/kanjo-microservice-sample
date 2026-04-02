-- name: ListInsights :many
SELECT * FROM kanjo.insights
WHERE
    dismissed = FALSE
    AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC
LIMIT $1;

-- name: GetInsight :one
SELECT * FROM kanjo.insights
WHERE id = $1;

-- name: CreateInsight :one
INSERT INTO kanjo.insights (type, title, description, action_url, expires_at, dedup_key)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
RETURNING *;

-- name: DismissInsight :exec
UPDATE kanjo.insights
SET dismissed = TRUE
WHERE id = $1;

-- name: DeleteExpiredInsights :exec
DELETE FROM kanjo.insights
WHERE expires_at IS NOT NULL AND expires_at < NOW();
