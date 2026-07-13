import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';

/** Empty state for the Recents panel when there are no frequent sites yet. */
export function EmptyRecents() {
  const { t } = useTranslation('browser');
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-glass bg-foreground/[0.02] px-4 py-6 text-center">
      <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
        <History className="w-3.5 h-3.5" />
      </span>
      <p className="text-[11.5px] font-medium text-foreground/80">
        {t('newTab.recents.empty.title')}
      </p>
      <p className="max-w-[28ch] text-[10.5px] text-muted-foreground">
        {t('newTab.recents.empty.body')}
      </p>
    </div>
  );
}
