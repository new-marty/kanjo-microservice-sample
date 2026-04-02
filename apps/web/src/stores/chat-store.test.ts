import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}));

vi.mock('@/lib/chat-api', () => ({
  streamChat: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  default: { t: (key: string) => key },
}));

const { useChatStore } = await import('./chat-store');

beforeEach(() => {
  useChatStore.setState({
    isOpen: false,
    messages: [],
    isLoading: false,
    conversationId: null,
    selectedModel: 'anthropic/claude-haiku-4.5',
    abortController: null,
  });
});

describe('chat store', () => {
  it('toggle flips isOpen', () => {
    expect(useChatStore.getState().isOpen).toBe(false);
    useChatStore.getState().toggle();
    expect(useChatStore.getState().isOpen).toBe(true);
    useChatStore.getState().toggle();
    expect(useChatStore.getState().isOpen).toBe(false);
  });

  it('open sets isOpen to true', () => {
    useChatStore.getState().open();
    expect(useChatStore.getState().isOpen).toBe(true);
  });

  it('close sets isOpen to false', () => {
    useChatStore.setState({ isOpen: true });
    useChatStore.getState().close();
    expect(useChatStore.getState().isOpen).toBe(false);
  });

  it('setModel updates selectedModel', () => {
    useChatStore.getState().setModel('openai/gpt-4o');
    expect(useChatStore.getState().selectedModel).toBe('openai/gpt-4o');
  });

  it('clearMessages resets messages and conversationId', () => {
    useChatStore.setState({
      messages: [{ id: '1', role: 'user', content: 'hi', timestamp: new Date() }],
      conversationId: 'conv-1',
      isLoading: true,
    });
    useChatStore.getState().clearMessages();
    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().conversationId).toBeNull();
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  it('newConversation resets messages, conversationId, and isLoading', () => {
    useChatStore.setState({
      messages: [{ id: '1', role: 'user', content: 'hi', timestamp: new Date() }],
      conversationId: 'conv-1',
      isLoading: true,
    });
    useChatStore.getState().newConversation();
    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().conversationId).toBeNull();
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  it('cancelStream aborts the controller and stops loading', () => {
    const controller = new AbortController();
    useChatStore.setState({ abortController: controller, isLoading: true });
    useChatStore.getState().cancelStream();
    expect(controller.signal.aborted).toBe(true);
    expect(useChatStore.getState().isLoading).toBe(false);
    expect(useChatStore.getState().abortController).toBeNull();
  });

  it('cancelStream is a no-op when no controller exists', () => {
    useChatStore.setState({ abortController: null, isLoading: false });
    useChatStore.getState().cancelStream();
    expect(useChatStore.getState().isLoading).toBe(false);
  });
});
