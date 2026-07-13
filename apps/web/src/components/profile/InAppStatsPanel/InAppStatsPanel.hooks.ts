import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  startAppStatsPolling,
  stopAppStatsPolling,
  useAppStatsStore,
} from '@/stores/useAppStatsStore';
import { buildHeroLine, daysSinceCreated } from '@/lib/stats-conversions';
import type { IInAppStatsPanelView } from './InAppStatsPanel.types';

/**
 * "W aplikacji" tab body view model. Drives the 60s app-stats poll, derives the
 * hero line + footer labels, and owns the reset-confirm dialog state.
 */
export function useInAppStatsPanel(): IInAppStatsPanelView {
  const { t } = useTranslation('profile');
  const snapshot = useAppStatsStore(s => s.snapshot);
  const reset = useAppStatsStore(s => s.reset);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    startAppStatsPolling();
    return () => {
      stopAppStatsPolling();
    };
  }, []);

  const days = daysSinceCreated(snapshot);
  const hero = buildHeroLine(snapshot);
  const { totals } = snapshot;
  const daysLabel = t('appPanel.days', { count: days });
  const sessionsLabel = t('appPanel.sessions', { count: totals.sessionCount });

  const handleReset = useCallback(async () => {
    // Await the reset so the confirm dialog stays up (busy) until the store has
    // actually cleared, rather than closing optimistically mid-flight.
    await reset();
    setResetOpen(false);
  }, [reset]);

  return { snapshot, hero, totals, daysLabel, sessionsLabel, resetOpen, setResetOpen, handleReset };
}
