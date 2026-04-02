-- +goose Up
CREATE TABLE kanjo.app_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL DEFAULT '',
    is_secret   BOOLEAN NOT NULL DEFAULT false,
    description TEXT NOT NULL DEFAULT '',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO kanjo.app_settings (key, is_secret, description) VALUES
    ('openrouter_api_key', true, 'OpenRouter API key for LLM features'),
    ('llm_model', false, 'LLM model ID (e.g. anthropic/claude-haiku-4.5)'),
    ('mf_email', false, 'MoneyForward ME login email'),
    ('mf_password', true, 'MoneyForward ME login password'),
    ('gmail_user', false, 'Gmail address for OTP retrieval'),
    ('gmail_app_password', true, 'Gmail app-specific password'),
    ('bluebubbles_url', false, 'BlueBubbles API endpoint URL'),
    ('bluebubbles_password', true, 'BlueBubbles API password');

-- +goose Down
DROP TABLE IF EXISTS kanjo.app_settings;
