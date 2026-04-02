import { useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Moon, Sun, Monitor, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useChatStore } from '@/stores/chat-store';
import { PAGE_TITLE_KEYS } from '@/lib/constants';

export function Header() {
  const { t } = useTranslation();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const titleKey = PAGE_TITLE_KEYS[currentPath];
  const title = titleKey ? t(titleKey) : 'Kanjo';

  const { balanceVisible, toggleBalanceVisibility, theme, setTheme } = usePreferencesStore();
  const { toggle: toggleChat } = useChatStore();

  const cycleTheme = () => {
    const next = { system: 'light', light: 'dark', dark: 'system' } as const;
    setTheme(next[theme]);
  };

  const themeLabel = t(`settings.theme.${theme}`);
  const ThemeIcon = { system: Monitor, light: Sun, dark: Moon }[theme];

  return (
    <TooltipProvider delayDuration={0}>
      <header
        className="bg-card/80 sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6 backdrop-blur-sm"
        role="banner"
      >
        <h1 className="text-xl font-semibold">{title}</h1>

        <div className="flex items-center gap-2">
          {/* Balance visibility toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleBalanceVisibility}
                aria-label={balanceVisible ? t('header.hideBalances') : t('header.showBalances')}
                aria-pressed={balanceVisible}
              >
                {balanceVisible ? (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {balanceVisible ? t('header.hideBalances') : t('header.showBalances')}
            </TooltipContent>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleTheme}
                aria-label={t('header.theme', { mode: themeLabel })}
              >
                <ThemeIcon className="h-5 w-5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('header.theme', { mode: themeLabel })}</TooltipContent>
          </Tooltip>

          {/* AI Chat button (desktop) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleChat}
                className="from-ai hidden gap-2 bg-gradient-to-r to-purple-500 hover:opacity-90 sm:inline-flex"
                aria-label={t('nav.openAI')}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>{t('header.askAI')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('header.askAboutFinances')}</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
