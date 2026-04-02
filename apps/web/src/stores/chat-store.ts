import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { streamChat, type ChatSSEEvent } from '@/lib/chat-api';
import i18n from '@/lib/i18n';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  conversationId: string | null;
  selectedModel: string;
  abortController: AbortController | null;
  toggle: () => void;
  open: () => void;
  close: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setModel: (model: string) => void;
  cancelStream: () => void;
  newConversation: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      messages: [],
      isLoading: false,
      conversationId: null,
      selectedModel: 'anthropic/claude-haiku-4.5',
      abortController: null,

      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      setModel: (model: string) => set({ selectedModel: model }),

      cancelStream: () => {
        const { abortController } = get();
        if (abortController) {
          abortController.abort();
          set({ isLoading: false, abortController: null });
        }
      },

      newConversation: () => set({ messages: [], conversationId: null, isLoading: false }),

      sendMessage: async (content: string) => {
        const { selectedModel, conversationId } = get();

        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: new Date(),
        };

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };

        const controller = new AbortController();

        set((state) => ({
          messages: [...state.messages, userMessage, assistantMessage],
          isLoading: true,
          abortController: controller,
        }));

        const assistantId = assistantMessage.id;

        const onEvent = (event: ChatSSEEvent) => {
          switch (event.type) {
            case 'start':
              set({ conversationId: event.conversationId });
              break;
            case 'token':
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.content } : m
                ),
              }));
              break;
            case 'done':
              set({ isLoading: false, abortController: null });
              break;
            case 'error':
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: i18n.t('chat.chatError') } : m
                ),
                isLoading: false,
                abortController: null,
              }));
              break;
          }
        };

        try {
          await streamChat(content, {
            conversationId: conversationId ?? undefined,
            model: selectedModel,
            onEvent,
            signal: controller.signal,
          });
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === assistantId ? { ...m, content: i18n.t('chat.chatError') } : m
            ),
            isLoading: false,
            abortController: null,
          }));
        }
      },

      clearMessages: () => set({ messages: [], conversationId: null, isLoading: false }),
    }),
    {
      name: 'kanjo-chat',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
      }),
    }
  )
);
