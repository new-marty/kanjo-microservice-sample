-- +goose Up
CREATE TABLE kanjo.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kanjo.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES kanjo.chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_conversation ON kanjo.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_conversations_updated ON kanjo.chat_conversations(updated_at DESC);

-- +goose Down
DROP TABLE IF EXISTS kanjo.chat_messages;
DROP TABLE IF EXISTS kanjo.chat_conversations;
