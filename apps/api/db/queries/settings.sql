-- name: ListSettings :many
SELECT * FROM kanjo.app_settings
ORDER BY key;

-- name: GetSetting :one
SELECT * FROM kanjo.app_settings
WHERE key = $1;

-- name: UpsertSetting :exec
INSERT INTO kanjo.app_settings (key, value, is_secret, description, updated_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
