import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ChatPanel } from '@/components/chat/chat-panel';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/error-boundary';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { useTheme } from '@/hooks/use-theme';
import { useChatStore } from '@/stores/chat-store';
import { PAGE_TITLE_KEYS } from '@/lib/constants';

function AIFab() {
  const { isOpen, toggle } = useChatStore();
  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="from-ai fixed bottom-6 right-6 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br to-purple-500 shadow-lg transition-all hover:scale-105 hover:shadow-xl md:flex"
      aria-label="Open AI chat"
    >
      <Sparkles className="h-5 w-5 text-white" />
    </button>
  );
}

function RootComponent() {
  useSyncStatus();
  useTheme();
  const { t, i18n } = useTranslation();
  const routerState = useRouterState();
  const mainRef = useRef<HTMLElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  const getPageTitle = useCallback(() => {
    const key = PAGE_TITLE_KEYS[routerState.location.pathname];
    return key ? t(key) : t('pages.fallback');
  }, [routerState.location.pathname, t]);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus();
    }
    if (announcerRef.current) {
      announcerRef.current.textContent = t('common.navigatedTo', { page: getPageTitle() });
    }
  }, [getPageTitle, t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="bg-background flex min-h-screen">
      <a href="#main-content" className="skip-link">
        {t('common.skipLink')}
      </a>

      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <Sidebar />

      <div className="flex flex-1 flex-col pb-14 md:pb-0 md:pl-16">
        <Header />
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 overflow-auto p-4 outline-none md:p-6"
          role="main"
        >
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <ChatPanel />
      <AIFab />
      <Toaster position="top-right" />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ErrorBoundary,
});
