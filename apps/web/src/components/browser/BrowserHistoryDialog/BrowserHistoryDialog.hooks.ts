import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useBrowserStore } from '@/stores/useBrowserStore';
import type { IBrowserHistoryDialogView } from './BrowserHistoryDialog.types';

export function useBrowserHistoryDialog(
  onOpenChange: (open: boolean) => void,
  onNavigate: (url: string) => void
): IBrowserHistoryDialogView {
  const { t } = useTranslation('browser');
  const history = useBrowserStore(useShallow(s => s.history));
  const { removeHistoryEntry, clearHistory } = useBrowserStore.getState();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      e => e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)
    );
  }, [history, query]);

  const handleOpen = useCallback(
    (url: string) => {
      onNavigate(url);
      onOpenChange(false);
    },
    [onNavigate, onOpenChange]
  );

  const removeLabel = t('history.removeEntry');

  return {
    history,
    filtered,
    query,
    setQuery,
    handleOpen,
    removeHistoryEntry,
    clearHistory,
    removeLabel,
  };
}
