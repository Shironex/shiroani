import { useTranslation } from 'react-i18next';
import { X, Trash2, Star, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useBatchActionBar } from './BatchActionBar.hooks';

// Score chips 1-10 plus an explicit "clear" sentinel (0) for the score Select.
const SCORE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/**
 * Floating batch action bar shown while the library is in multi-select mode.
 * Reads the selection count via a granular selector so toggling individual
 * cards does not re-render the rest of the library grid.
 */
export default function BatchActionBar() {
  const { t } = useTranslation('library');
  const {
    count,
    statusOptions,
    showConfirm,
    setShowConfirm,
    dockClearanceClass,
    handleStatusChange,
    handleScoreChange,
    handleExit,
    handleConfirmDelete,
  } = useBatchActionBar();

  const statusItems = statusOptions.map(opt => (
    <SelectItem key={opt.value} value={opt.value} className="text-xs">
      {opt.label}
    </SelectItem>
  ));

  const scoreItems = SCORE_VALUES.map(value => (
    <SelectItem key={value} value={String(value)} className="text-xs">
      {value === 0 ? t('batch.clearScore') : `${value}/10`}
    </SelectItem>
  ));

  if (count === 0) {
    // Selection mode is on but nothing is picked yet — keep a slim hint bar so
    // the user can still exit the mode.
    return (
      <div
        className={cn(
          'flex-shrink-0 px-7 py-2.5 border-t border-border-glass bg-background/60 flex items-center gap-2',
          dockClearanceClass
        )}
      >
        <ListChecks className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{t('batch.hint')}</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs gap-1.5"
          onClick={handleExit}
        >
          <X className="w-3.5 h-3.5" />
          {t('batch.exit')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'flex-shrink-0 px-7 py-2.5 border-t border-border-glass bg-background/60 flex items-center gap-2 flex-wrap',
          dockClearanceClass
        )}
      >
        <span className="text-xs font-medium text-foreground">
          {t('batch.selectedCount', { count })}
        </span>

        <div className="w-px h-4 bg-border-glass mx-1" />

        {/* Change status */}
        <Select value="" onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[150px] h-8 text-xs bg-background/40 border-border-glass">
            <SelectValue placeholder={t('batch.setStatus')} />
          </SelectTrigger>
          <SelectContent>{statusItems}</SelectContent>
        </Select>

        {/* Set / clear score */}
        <Select value="" onValueChange={handleScoreChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-background/40 border-border-glass">
            <Star
              className="w-3.5 h-3.5 text-[oklch(0.8_0.14_70)]"
              strokeWidth={0}
              fill="currentColor"
            />
            <SelectValue placeholder={t('batch.setScore')} />
          </SelectTrigger>
          <SelectContent>{scoreItems}</SelectContent>
        </Select>

        {/* Delete selection */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('batch.delete')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 text-xs gap-1.5"
          onClick={handleExit}
        >
          <X className="w-3.5 h-3.5" />
          {t('batch.exit')}
        </Button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={t('batch.confirmDeleteTitle')}
        description={t('batch.confirmDeleteDescription', { count })}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
