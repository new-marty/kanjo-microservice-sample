-- name: CreateConversation :one
INSERT INTO kanjo.chat_conversations (title, model)
VALUES ($1, $2)
RETURNING *;

-- name: GetConversation :one
SELECT * FROM kanjo.chat_conversations
WHERE id = $1;

-- name: ListConversations :many
SELECT * FROM kanjo.chat_conversations
ORDER BY updated_at DESC
LIMIT $1;

-- name: DeleteConversation :exec
DELETE FROM kanjo.chat_conversations
WHERE id = $1;

-- name: CreateChatMessage :one
INSERT INTO kanjo.chat_messages (conversation_id, role, content)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListChatMessages :many
SELECT * FROM kanjo.chat_messages
WHERE conversation_id = $1
ORDER BY created_at ASC;

-- name: TouchConversation :exec
UPDATE kanjo.chat_conversations
SET updated_at = NOW()
WHERE id = $1;
