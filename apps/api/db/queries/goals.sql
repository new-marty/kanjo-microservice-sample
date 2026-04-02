-- name: ListGoals :many
SELECT * FROM kanjo.savings_goals
WHERE archived = FALSE
ORDER BY deadline NULLS LAST, created_at DESC;

-- name: ListAllGoals :many
SELECT * FROM kanjo.savings_goals
ORDER BY archived, deadline NULLS LAST, created_at DESC;

-- name: GetGoal :one
SELECT * FROM kanjo.savings_goals
WHERE id = $1;

-- name: CreateGoal :one
INSERT INTO kanjo.savings_goals (name, target_amount, current_amount, deadline, icon, color)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateGoal :exec
UPDATE kanjo.savings_goals
SET
    name = COALESCE(sqlc.narg('name'), name),
    target_amount = COALESCE(sqlc.narg('target_amount'), target_amount),
    current_amount = COALESCE(sqlc.narg('current_amount'), current_amount),
    deadline = COALESCE(sqlc.narg('deadline'), deadline),
    icon = COALESCE(sqlc.narg('icon'), icon),
    color = COALESCE(sqlc.narg('color'), color),
    archived = COALESCE(sqlc.narg('archived'), archived),
    updated_at = NOW()
WHERE id = $1;

-- name: DeleteGoal :exec
DELETE FROM kanjo.savings_goals
WHERE id = $1;

-- name: ArchiveGoal :exec
UPDATE kanjo.savings_goals
SET archived = TRUE, updated_at = NOW()
WHERE id = $1;
