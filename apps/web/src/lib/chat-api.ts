export type ChatSSEEvent =
  | { type: 'start'; conversationId: string }
  | { type: 'token'; content: string }
  | { type: 'done'; suggestions: string[] }
  | { type: 'error'; message: string };

interface StreamChatOptions {
  conversationId?: string;
  model?: string;
  onEvent: (event: ChatSSEEvent) => void;
  signal?: AbortSignal;
}

export async function streamChat(
  message: string,
  { conversationId, model, onEvent, signal }: StreamChatOptions
): Promise<void> {
  const body: Record<string, string> = { message };
  if (conversationId) body.conversation_id = conversationId;
  if (model) body.model = model;

  const resp = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    let message: string;
    try {
      const body = (await resp.json()) as { error?: string };
      message = body.error ?? resp.statusText;
    } catch {
      message = resp.statusText;
    }
    onEvent({ type: 'error', message });
    return;
  }

  const reader = resp.body?.getReader();
  if (!reader) {
    onEvent({ type: 'error', message: 'No response body' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (!data) continue;

      try {
        const event = JSON.parse(data) as ChatSSEEvent;
        onEvent(event);
      } catch (e) {
        console.warn('Malformed SSE event:', data, e);
      }
    }
  }
}
