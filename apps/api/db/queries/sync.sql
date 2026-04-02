-- name: GetLastSyncStatus :one
SELECT id, status, completed_at, transactions_processed, transactions_transformed
FROM kanjo.transform_runs
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
