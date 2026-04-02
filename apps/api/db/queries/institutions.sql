-- name: ListInstitutions :many
SELECT
    institution_name,
    COALESCE(display_name, institution_name) as display_name,
    icon,
    COALESCE(color, '#6B7280') as color,
    hidden
FROM kanjo.institutions
ORDER BY institution_name;

-- name: GetInstitution :one
SELECT
    institution_name,
    COALESCE(display_name, institution_name) as display_name,
    icon,
    COALESCE(color, '#6B7280') as color,
    hidden
FROM kanjo.institutions
WHERE institution_name = $1;

-- name: UpsertInstitution :exec
INSERT INTO kanjo.institutions (institution_name, display_name, icon, color, hidden, updated_at)
VALUES ($1, $2, $3, $4, $5, NOW())
ON CONFLICT (institution_name) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, kanjo.institutions.display_name),
    icon = COALESCE(EXCLUDED.icon, kanjo.institutions.icon),
    color = COALESCE(EXCLUDED.color, kanjo.institutions.color),
    hidden = COALESCE(EXCLUDED.hidden, kanjo.institutions.hidden),
    updated_at = NOW();
