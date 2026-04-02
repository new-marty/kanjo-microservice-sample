-- +goose Up
ALTER TABLE kanjo.insights ADD COLUMN dedup_key TEXT;
CREATE UNIQUE INDEX idx_insights_dedup_key ON kanjo.insights (dedup_key) WHERE dedup_key IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS kanjo.idx_insights_dedup_key;
ALTER TABLE kanjo.insights DROP COLUMN IF EXISTS dedup_key;
