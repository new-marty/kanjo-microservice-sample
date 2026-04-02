import { Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  PiggyBank,
  Target,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';

const navItemDefs = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/transactions', icon: Receipt, labelKey: 'nav.transactions' },
  { to: '/cash-flow', icon: TrendingUp, labelKey: 'nav.cashFlow' },
  { to: '/assets', icon: PiggyBank, labelKey: 'nav.assets' },
  { to: '/goals', icon: Target, labelKey: 'nav.goals' },
] as const;

function MobileNav() {
  const { t } = useTranslation();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { toggle: toggleChat } = useChatStore();

  return (
    <nav
      className="bg-card fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t md:hidden"
      role="navigation"
      aria-label={t('nav.mainNav')}
    >
      {navItemDefs.map((item) => {
        const isActive = currentPath === item.to;
        const label = t(item.labelKey);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
      <button
        onClick={toggleChat}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-purple-500 transition-colors"
        aria-label={t('nav.openAI')}
      >
        <Sparkles className="h-5 w-5" aria-hidden="true" />
        <span>AI</span>
      </button>
      <Link
        to="/settings"
        className={cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
          currentPath === '/settings' ? 'text-foreground' : 'text-muted-foreground'
        )}
        aria-current={currentPath === '/settings' ? 'page' : undefined}
      >
        <Settings className="h-5 w-5" aria-hidden="true" />
        <span>{t('nav.settings')}</span>
      </Link>
    </nav>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { toggle: toggleChat } = useChatStore();

  return (
    <>
      <MobileNav />
      <TooltipProvider delayDuration={0}>
        <aside
          className="bg-card fixed left-0 top-0 z-40 hidden h-screen w-16 flex-col border-r md:flex"
          role="navigation"
          aria-label={t('nav.mainNav')}
        >
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b">
            <Link
              to="/"
              className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg font-mono text-lg font-bold"
              aria-label={t('nav.home')}
            >
              ¥
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col gap-1 p-2">
            {navItemDefs.map((item) => {
              const isActive = currentPath === item.to;
              const label = t(item.labelKey);
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      className={cn(
                        'relative flex h-10 w-full items-center justify-center rounded-md transition-colors',
                        isActive
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {isActive && (
                        <span
                          className="bg-primary absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
                          aria-hidden="true"
                        />
                      )}
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">{label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="flex flex-col gap-1 border-t p-2">
            {/* AI Chat Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleChat}
                  className="from-ai flex h-10 w-full items-center justify-center rounded-md bg-gradient-to-r to-purple-500 text-white transition-opacity hover:opacity-90"
                  aria-label={t('nav.openAI')}
                >
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('nav.aiAssistant')}</TooltipContent>
            </Tooltip>

            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/settings"
                  className={cn(
                    'relative flex h-10 w-full items-center justify-center rounded-md transition-colors',
                    currentPath === '/settings'
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  aria-current={currentPath === '/settings' ? 'page' : undefined}
                >
                  {currentPath === '/settings' && (
                    <span
                      className="bg-primary absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
                      aria-hidden="true"
                    />
                  )}
                  <Settings className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">{t('nav.settings')}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{t('nav.settings')}</TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>
    </>
  );
}
