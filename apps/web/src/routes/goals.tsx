import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  Loader2,
  Plus,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
} from 'lucide-react';
import { differenceInDays, differenceInMonths, parseISO } from 'date-fns';
import { formatYen } from '@repo/shared';
import { useTranslation } from 'react-i18next';
import {
  useListGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  getListGoalsQueryKey,
} from '@repo/api-client';
import type { HandlerCreateGoalRequest } from '@repo/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePreferencesStore } from '@/stores/preferences-store';

export const Route = createFileRoute('/goals')({
  component: Goals,
  errorComponent: ErrorBoundary,
});

interface GoalFormData {
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon: string;
  color: string;
}

const defaultFormData: GoalFormData = {
  name: '',
  target_amount: 0,
  current_amount: 0,
  deadline: '',
  icon: '🎯',
  color: '#6B7280',
};

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editGoal?: { id: number } & GoalFormData;
}

function GoalFormDialog({ open, onOpenChange, editGoal }: GoalFormDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const isEdit = !!editGoal;

  const [form, setForm] = useState<GoalFormData>(editGoal ?? defaultFormData);

  const resetAndClose = () => {
    setForm(defaultFormData);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.target_amount <= 0) return;

    const invalidate = () =>
      void queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });

    if (isEdit) {
      updateMutation.mutate(
        {
          id: editGoal.id,
          data: {
            name: form.name,
            target_amount: form.target_amount,
            current_amount: form.current_amount,
            deadline: form.deadline || undefined,
            icon: form.icon || undefined,
            color: form.color || undefined,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            toast(t('goals.toast.updated'));
            resetAndClose();
          },
          onError: () => toast.error(t('goals.toast.updateFailed')),
        }
      );
    } else {
      const data: HandlerCreateGoalRequest = {
        name: form.name,
        target_amount: form.target_amount,
        current_amount: form.current_amount || undefined,
        deadline: form.deadline || undefined,
        icon: form.icon || undefined,
        color: form.color || undefined,
      };
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            invalidate();
            toast(t('goals.toast.created'));
            resetAndClose();
          },
          onError: () => toast.error(t('goals.toast.createFailed')),
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAndClose();
        else onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('goals.dialog.editTitle') : t('goals.dialog.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">{t('goals.dialog.name')}</Label>
            <Input
              id="goal-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('goals.dialog.namePlaceholder')}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-target">{t('goals.dialog.targetAmount')}</Label>
              <Input
                id="goal-target"
                type="number"
                value={form.target_amount || ''}
                onChange={(e) => setForm((f) => ({ ...f, target_amount: Number(e.target.value) }))}
                placeholder="1000000"
                className="font-mono"
                required
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-current">{t('goals.dialog.currentAmount')}</Label>
              <Input
                id="goal-current"
                type="number"
                value={form.current_amount || ''}
                onChange={(e) => setForm((f) => ({ ...f, current_amount: Number(e.target.value) }))}
                placeholder="0"
                className="font-mono"
                min={0}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-deadline">{t('goals.dialog.deadline')}</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={form.deadline ? form.deadline.slice(0, 10) : ''}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-icon">{t('goals.dialog.icon')}</Label>
              <Input
                id="goal-icon"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="🎯"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-color">{t('goals.dialog.color')}</Label>
              <Input
                id="goal-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isPending || !form.name.trim() || form.target_amount <= 0}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface GoalData {
  id: number;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

function GoalCard({
  goal,
  balanceVisible,
  onEdit,
  onArchive,
  onDelete,
}: {
  goal: GoalData;
  balanceVisible: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateGoal();
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState(String(goal.currentAmount));

  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  const deadline = goal.deadline ? parseISO(goal.deadline) : null;
  const now = new Date();
  const daysRemaining = deadline ? differenceInDays(deadline, now) : 0;
  const monthsRemaining = deadline ? Math.max(differenceInMonths(deadline, now), 1) : 0;
  const monthlyRequired = daysRemaining > 0 ? remaining / monthsRemaining : 0;

  const saveAmount = () => {
    const newAmount = Number(amountInput);
    if (isNaN(newAmount) || newAmount < 0) return;
    updateMutation.mutate(
      { id: goal.id, data: { current_amount: newAmount } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
          toast(t('goals.toast.progressUpdated'));
          setEditingAmount(false);
        },
        onError: () => toast.error(t('goals.toast.progressFailed')),
      }
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: goal.color }} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{goal.icon}</span>
            <div>
              <CardTitle className="text-lg">{goal.name}</CardTitle>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5" />
                {deadline ? (
                  daysRemaining > 0 ? (
                    <span>{t('goals.daysRemaining', { days: daysRemaining })}</span>
                  ) : (
                    <span className="text-expense">{t('goals.expired')}</span>
                  )
                ) : (
                  <span>{t('goals.noDeadline')}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              style={{
                borderColor: `${goal.color}40`,
                backgroundColor: `${goal.color}10`,
                color: goal.color,
              }}
            >
              {progress.toFixed(0)}%
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  {t('goals.archive')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-end justify-between">
            {editingAmount ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="h-8 w-32 font-mono"
                  min={0}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveAmount();
                    if (e.key === 'Escape') setEditingAmount(false);
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveAmount}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    t('common.save')
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingAmount(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="font-mono text-2xl font-bold hover:underline"
                onClick={() => {
                  setAmountInput(String(goal.currentAmount));
                  setEditingAmount(true);
                }}
                title={t('goals.clickToUpdateProgress')}
              >
                {balanceVisible ? formatYen(goal.currentAmount) : '¥•••••'}
              </button>
            )}
            <span className="text-muted-foreground text-sm">
              / {balanceVisible ? formatYen(goal.targetAmount) : '¥•••••'}
            </span>
          </div>
          <Progress
            value={progress}
            className="h-3"
            style={
              {
                '--progress-color': goal.color,
              } as React.CSSProperties
            }
          />
        </div>
        <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground">{t('goals.monthlyRequired')}</span>
          </div>
          <span className="font-mono font-medium">
            {balanceVisible && daysRemaining > 0 ? formatYen(Math.ceil(monthlyRequired)) : '¥•••••'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Goals() {
  const { t } = useTranslation();
  const { balanceVisible } = usePreferencesStore();
  const queryClient = useQueryClient();
  const { data: goalsRes, isLoading, error, refetch } = useListGoals();
  const updateMutation = useUpdateGoal();
  const deleteMutation = useDeleteGoal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<({ id: number } & GoalFormData) | undefined>();

  const invalidate = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() }),
    [queryClient]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">{t('common.loadError')}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const goals: GoalData[] = (goalsRes?.data?.data ?? []).map((g) => ({
    id: g.id ?? 0,
    name: g.name ?? '',
    icon: g.icon ?? '🎯',
    color: g.color ?? '#6B7280',
    targetAmount: g.target_amount ?? 0,
    currentAmount: g.current_amount ?? 0,
    deadline: g.deadline ?? '',
  }));

  const handleEdit = (goal: GoalData) => {
    setEditGoal({
      id: goal.id,
      name: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      deadline: goal.deadline,
      icon: goal.icon,
      color: goal.color,
    });
    setDialogOpen(true);
  };

  const handleArchive = (goal: GoalData) => {
    updateMutation.mutate(
      { id: goal.id, data: { archived: true } },
      {
        onSuccess: () => {
          invalidate();
          toast(t('goals.toast.archived'), {
            action: {
              label: t('common.undo'),
              onClick: () => {
                updateMutation.mutate(
                  { id: goal.id, data: { archived: false } },
                  { onSuccess: invalidate }
                );
              },
            },
          });
        },
        onError: () => toast.error(t('goals.toast.archiveFailed')),
      }
    );
  };

  const handleDelete = (goal: GoalData) => {
    if (!window.confirm(t('goals.confirmDelete', { name: goal.name }))) return;
    deleteMutation.mutate(
      { id: goal.id },
      {
        onSuccess: () => {
          invalidate();
          toast(t('goals.toast.deleted'));
        },
        onError: () => toast.error(t('goals.toast.deleteFailed')),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('goals.title')}</h1>
          <p className="text-muted-foreground">{t('goals.description')}</p>
        </div>
        <Button
          onClick={() => {
            setEditGoal(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('goals.addGoal')}
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">{t('goals.noGoals')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              balanceVisible={balanceVisible}
              onEdit={() => handleEdit(goal)}
              onArchive={() => handleArchive(goal)}
              onDelete={() => handleDelete(goal)}
            />
          ))}
        </div>
      )}

      <GoalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editGoal={editGoal}
        key={editGoal?.id ?? 'create'}
      />
    </div>
  );
}
