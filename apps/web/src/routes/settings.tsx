import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/error-boundary';
import { formatYen } from '@repo/shared';
import { useTranslation } from 'react-i18next';
import {
  useListBudgets,
  useUpsertBudget,
  useDeleteBudget,
  getListBudgetsQueryKey,
  useListInstitutions,
  useUpdateInstitution,
  getListInstitutionsQueryKey,
  useGetSyncStatus,
  getGetDashboardQueryKey,
  useListSettings,
  useUpdateSetting,
  getListSettingsQueryKey,
} from '@repo/api-client';
import type {
  HandlerBudgetWithProgressResponse,
  HandlerInstitutionResponse,
  HandlerSyncStatusResponse,
  HandlerSettingResponse,
} from '@repo/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { usePreferencesStore } from '@/stores/preferences-store';
import { Save, Trash2, Plus, Check, Loader2, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const Route = createFileRoute('/settings')({
  component: Settings,
  errorComponent: ErrorBoundary,
});

interface BudgetRowState {
  monthlyBudget: number;
  rolloverEnabled: boolean;
  dirty: boolean;
}

function BudgetRow({
  budget,
  onSave,
  onDelete,
  isSaving,
}: {
  budget: HandlerBudgetWithProgressResponse;
  onSave: (
    categoryName: string,
    monthlyBudget: number,
    rolloverEnabled: boolean,
    color: string
  ) => void;
  onDelete: (categoryName: string) => void;
  isSaving: boolean;
}) {
  const [state, setState] = useState<BudgetRowState>({
    monthlyBudget: budget.monthly_budget,
    rolloverEnabled: budget.rollover_enabled,
    dirty: false,
  });

  return (
    <div className="grid grid-cols-[1fr,120px,80px,80px] items-center gap-4">
      <span className="font-medium">{budget.category_name}</span>
      <Input
        type="number"
        value={state.monthlyBudget}
        onChange={(e) =>
          setState((s) => ({
            ...s,
            monthlyBudget: Number(e.target.value),
            dirty: true,
          }))
        }
        className="font-mono"
      />
      <div className="flex items-center justify-center">
        <Checkbox
          checked={state.rolloverEnabled}
          onCheckedChange={(checked) =>
            setState((s) => ({
              ...s,
              rolloverEnabled: checked === true,
              dirty: true,
            }))
          }
        />
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={!state.dirty || isSaving}
          onClick={() => {
            onSave(budget.category_name, state.monthlyBudget, state.rolloverEnabled, budget.color);
            setState((s) => ({ ...s, dirty: false }));
          }}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(budget.category_name)}>
          <Trash2 className="text-destructive h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function NewBudgetRow({
  onSave,
  isSaving,
}: {
  onSave: (name: string, amount: number) => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);

  const handleSave = () => {
    if (!name.trim() || amount <= 0) return;
    onSave(name.trim(), amount);
    setName('');
    setAmount(0);
  };

  return (
    <div className="grid grid-cols-[1fr,120px,80px,80px] items-center gap-4">
      <Input
        placeholder={t('settings.budget.categoryPlaceholder')}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        type="number"
        placeholder={t('settings.budget.amountPlaceholder')}
        value={amount || ''}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="font-mono"
      />
      <div />
      <Button
        variant="ghost"
        size="icon"
        disabled={!name.trim() || amount <= 0 || isSaving}
        onClick={handleSave}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function BudgetSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: budgetsRes, isLoading, error } = useListBudgets();
  const upsertMutation = useUpsertBudget();
  const deleteMutation = useDeleteBudget();
  const [savingCategory, setSavingCategory] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  }, [queryClient]);

  const budgets = budgetsRes?.data?.data ?? [];

  const handleSave = (
    categoryName: string,
    monthlyBudget: number,
    rolloverEnabled: boolean,
    color: string
  ) => {
    setSavingCategory(categoryName);
    const previousBudget = budgets.find((b) => b.category_name === categoryName);
    upsertMutation.mutate(
      {
        data: {
          category_name: categoryName,
          monthly_budget: monthlyBudget,
          rollover_enabled: rolloverEnabled,
          color,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          toast(t('settings.budgetToast.updated'), {
            action: previousBudget
              ? {
                  label: t('common.undo'),
                  onClick: () => {
                    upsertMutation.mutate(
                      {
                        data: {
                          category_name: previousBudget.category_name,
                          monthly_budget: previousBudget.monthly_budget,
                          rollover_enabled: previousBudget.rollover_enabled,
                          color: previousBudget.color,
                        },
                      },
                      { onSuccess: invalidate }
                    );
                  },
                }
              : undefined,
          });
          setSavingCategory(null);
        },
        onError: () => {
          toast.error(t('settings.budgetToast.updateFailed'));
          setSavingCategory(null);
        },
      }
    );
  };

  const handleCreate = (name: string, amount: number) => {
    setSavingCategory('__new__');
    upsertMutation.mutate(
      { data: { category_name: name, monthly_budget: amount } },
      {
        onSuccess: () => {
          invalidate();
          toast(t('settings.budgetToast.created'));
          setSavingCategory(null);
        },
        onError: () => {
          toast.error(t('settings.budgetToast.createFailed'));
          setSavingCategory(null);
        },
      }
    );
  };

  const handleDelete = (categoryName: string) => {
    const previousBudget = budgets.find((b) => b.category_name === categoryName);
    deleteMutation.mutate(
      { category: categoryName },
      {
        onSuccess: () => {
          invalidate();
          toast(t('settings.budgetToast.deleted'), {
            action: previousBudget
              ? {
                  label: t('common.undo'),
                  onClick: () => {
                    upsertMutation.mutate(
                      {
                        data: {
                          category_name: previousBudget.category_name,
                          monthly_budget: previousBudget.monthly_budget,
                          rollover_enabled: previousBudget.rollover_enabled,
                          color: previousBudget.color,
                        },
                      },
                      { onSuccess: invalidate }
                    );
                  },
                }
              : undefined,
          });
        },
        onError: () => {
          toast.error(t('settings.budgetToast.deleteFailed'));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.budget.title')}</CardTitle>
          <CardDescription>{t('settings.budget.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr,120px,80px,80px] items-center gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="mx-auto h-4 w-4" />
                <Skeleton className="h-9 w-9" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.budget.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('settings.budget.loadError')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.budget.title')}</CardTitle>
        <CardDescription>{t('settings.budget.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {budgets.length === 0 ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">{t('settings.budget.noBudgets')}</p>
            <NewBudgetRow onSave={handleCreate} isSaving={savingCategory === '__new__'} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-muted-foreground grid grid-cols-[1fr,120px,80px,80px] gap-4 text-sm font-medium">
              <span>{t('settings.budget.category')}</span>
              <span>{t('settings.budget.monthlyBudget')}</span>
              <span>{t('settings.budget.rollover')}</span>
              <span></span>
            </div>
            <Separator />
            {budgets.map((budget) => (
              <BudgetRow
                key={budget.category_name}
                budget={budget}
                onSave={handleSave}
                onDelete={handleDelete}
                isSaving={savingCategory === budget.category_name}
              />
            ))}
            <Separator />
            <NewBudgetRow onSave={handleCreate} isSaving={savingCategory === '__new__'} />
          </div>
        )}
        <div className="bg-muted/50 mt-6 flex items-center justify-between rounded-lg p-4">
          <div>
            <p className="font-medium">{t('settings.budget.totalLabel')}</p>
            <p className="text-muted-foreground text-sm">{t('settings.budget.totalDescription')}</p>
          </div>
          <span className="font-mono text-xl font-bold">
            {formatYen(budgets.reduce((sum, c) => sum + c.monthly_budget, 0))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function InstitutionRow({
  institution,
  onToggle,
  isUpdating,
}: {
  institution: HandlerInstitutionResponse;
  onToggle: (name: string, hidden: boolean) => void;
  isUpdating: boolean;
}) {
  const { t } = useTranslation();
  const checkboxId = `hide-${institution.institution_name}`;
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div
          className="bg-muted flex h-10 w-10 items-center justify-center rounded-full"
          style={institution.color ? { backgroundColor: institution.color + '20' } : undefined}
        >
          <span className="text-lg">{institution.icon ?? '🏦'}</span>
        </div>
        <div>
          <p className="font-medium">{institution.display_name || institution.institution_name}</p>
          {institution.display_name &&
            institution.display_name !== institution.institution_name && (
              <p className="text-muted-foreground text-sm">{institution.institution_name}</p>
            )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={checkboxId}
          checked={!institution.hidden}
          disabled={isUpdating}
          onCheckedChange={(checked) => onToggle(institution.institution_name, checked !== true)}
        />
        <label htmlFor={checkboxId} className="text-muted-foreground text-sm">
          {t('settings.institution.show')}
        </label>
      </div>
    </div>
  );
}

function InstitutionSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: institutionsRes, isLoading, error } = useListInstitutions();
  const updateMutation = useUpdateInstitution();

  const institutions = institutionsRes?.data?.data ?? [];

  const handleToggle = (name: string, hidden: boolean) => {
    updateMutation.mutate(
      { name, data: { hidden } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() });
        },
        onError: () => {
          toast.error(t('settings.institution.updateFailed'));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.institution.title')}</CardTitle>
          <CardDescription>{t('settings.institution.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.institution.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('settings.institution.loadError')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.institution.title')}</CardTitle>
        <CardDescription>{t('settings.institution.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {institutions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('settings.institution.noInstitutions')}
            </p>
          ) : (
            institutions.map((inst) => (
              <InstitutionRow
                key={inst.institution_name}
                institution={inst}
                onToggle={handleToggle}
                isUpdating={updateMutation.isPending}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SyncSection() {
  const { t } = useTranslation();

  const { data, isLoading } = useGetSyncStatus<{
    data: HandlerSyncStatusResponse;
    status: number;
    headers: Headers;
  }>();

  const syncData = data?.data;
  const lastSync = syncData?.last_sync_at;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.sync.title')}</CardTitle>
        <CardDescription>{t('settings.sync.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border p-4">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-sm">{t('common.loading')}</span>
            </div>
          ) : lastSync ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="border-income/30 bg-income/10 text-income inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  <Check className="mr-1 h-3 w-3" />
                  {t('settings.sync.synced')}
                </span>
                <span className="text-muted-foreground text-sm">
                  {new Date(lastSync).toLocaleString()}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('settings.sync.stats', {
                  processed: syncData?.transactions_processed ?? 0,
                  transformed: syncData?.transactions_transformed ?? 0,
                })}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('settings.sync.noSync')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const SETTING_GROUPS = [
  {
    labelKey: 'settings.credentials.llm',
    keys: ['openrouter_api_key', 'llm_model'],
  },
  {
    labelKey: 'settings.credentials.moneyforward',
    keys: ['mf_email', 'mf_password'],
  },
  {
    labelKey: 'settings.credentials.gmailOtp',
    keys: ['gmail_user', 'gmail_app_password'],
  },
  {
    labelKey: 'settings.credentials.bluebubbles',
    keys: ['bluebubbles_url', 'bluebubbles_password'],
  },
] as const;

function SettingRow({
  setting,
  onSave,
  isSaving,
}: {
  setting: HandlerSettingResponse;
  onSave: (key: string, value: string) => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const handleEdit = () => {
    setValue(setting.is_secret ? '' : setting.value);
    setEditing(true);
  };

  const handleSave = () => {
    onSave(setting.key, value);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setValue('');
  };

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{setting.description}</span>
          <span
            className={`inline-flex h-2 w-2 rounded-full ${setting.configured ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
            title={
              setting.configured
                ? t('settings.credentials.configured')
                : t('settings.credentials.notConfigured')
            }
          />
        </div>
        {!editing && (
          <p className="text-muted-foreground truncate font-mono text-sm">
            {setting.configured ? setting.value : t('settings.credentials.notConfigured')}
          </p>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            type={setting.is_secret ? 'password' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={setting.description}
            className="w-[240px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <Button variant="ghost" size="icon" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon" onClick={handleEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function CredentialsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: settingsRes, isLoading, error } = useListSettings();
  const updateMutation = useUpdateSetting();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const settings = settingsRes?.data?.data ?? [];
  const settingsMap = new Map(settings.map((s) => [s.key, s]));

  const handleSave = (key: string, value: string) => {
    setSavingKey(key);
    updateMutation.mutate(
      { key, data: { value } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListSettingsQueryKey() });
          toast(t('settings.credentials.saved'));
          setSavingKey(null);
        },
        onError: () => {
          toast.error(t('settings.credentials.saveFailed'));
          setSavingKey(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.credentials.title')}</CardTitle>
          <CardDescription>{t('settings.credentials.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-9 w-9" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.credentials.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('settings.credentials.loadError')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.credentials.title')}</CardTitle>
        <CardDescription>{t('settings.credentials.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {SETTING_GROUPS.map((group) => {
          const groupSettings = group.keys
            .map((key) => settingsMap.get(key))
            .filter((s): s is HandlerSettingResponse => s != null);
          if (groupSettings.length === 0) return null;
          return (
            <div key={group.labelKey}>
              <h4 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
                {t(group.labelKey)}
              </h4>
              <div className="divide-y">
                {groupSettings.map((setting) => (
                  <SettingRow
                    key={setting.key}
                    setting={setting}
                    onSave={handleSave}
                    isSaving={savingKey === setting.key}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = usePreferencesStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.description')}</p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language.title')}</CardTitle>
          <CardDescription>{t('settings.language.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>{t('settings.language.label')}</Label>
            <Select value={i18n.language} onValueChange={(v) => void i18n.changeLanguage(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.theme.title')}</CardTitle>
          <CardDescription>{t('settings.theme.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>{t('settings.theme.label')}</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">{t('settings.theme.system')}</SelectItem>
                <SelectItem value="light">{t('settings.theme.light')}</SelectItem>
                <SelectItem value="dark">{t('settings.theme.dark')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <CredentialsSection />

      <BudgetSection />

      <InstitutionSection />

      <SyncSection />
    </div>
  );
}
