import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChatStore, type ChatMessage } from '@/stores/chat-store';
import { cn } from '@/lib/utils';

const MODELS = [
  { value: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku' },
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet' },
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini Flash' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
];

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <p className="whitespace-pre-wrap text-sm">
          {message.content}
          {isStreaming && <span className="ml-0.5 inline-block animate-pulse">▌</span>}
        </p>
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { t } = useTranslation();
  const {
    isOpen,
    close,
    messages,
    isLoading,
    sendMessage,
    selectedModel,
    setModel,
    newConversation,
  } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    t('chat.suggestions.analyzeSpending'),
    t('chat.suggestions.improveSavings'),
    t('chat.suggestions.foodTrend'),
    t('chat.suggestions.budgetSuggestion'),
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    void sendMessage(message);
  };

  const handleSuggestionClick = (suggestion: string) => {
    void sendMessage(suggestion);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('chat.title')}
        className="bg-background animate-in slide-in-from-right fixed right-0 top-0 z-50 flex h-full w-full max-w-[360px] flex-col border-l shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="from-ai flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r to-purple-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">{t('chat.title')}</h2>
              <p className="text-muted-foreground text-xs">{t('chat.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={newConversation}
              aria-label={t('chat.newChat')}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={close} aria-label={t('chat.close')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Model selector */}
        <div className="border-b px-4 py-2">
          <Select value={selectedModel} onValueChange={setModel}>
            <SelectTrigger className="h-8 text-xs" aria-label={t('chat.modelSelect')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value} className="text-xs">
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4 pt-4">
                <p className="text-muted-foreground text-center text-sm">{t('chat.emptyState')}</p>
                <div className="space-y-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="hover:bg-accent w-full rounded-lg border p-3 text-left text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={
                    isLoading && message.role === 'assistant' && index === messages.length - 1
                  }
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="from-ai bg-gradient-to-r to-purple-500 hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
