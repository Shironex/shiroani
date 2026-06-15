import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTimeUntilAiring } from '@/lib/anime-utils';
import type { ICountdownBadgeProps, ICountdownBadgeView } from './CountdownBadge.types';

// Shared timer: all CountdownBadge instances share a single setInterval
let currentTimestamp = Math.floor(Date.now() / 1000);
const listeners = new Set<() => void>();
setInterval(() => {
  currentTimestamp = Math.floor(Date.now() / 1000);
  listeners.forEach(fn => fn());
}, 60_000);

function useSharedTimestamp() {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return currentTimestamp;
}

export function useCountdownBadge({
  airingAt,
  episode,
}: ICountdownBadgeProps): ICountdownBadgeView {
  const { t } = useTranslation('common');
  const now = useSharedTimestamp();

  const secondsLeft = airingAt - now;
  if (secondsLeft <= 0) return { label: null };

  const label =
    secondsLeft < 15 * 60
      ? t('countdown.soon')
      : t('countdown.episodeBadge', { episode, countdown: formatTimeUntilAiring(secondsLeft) });

  return { label };
}
