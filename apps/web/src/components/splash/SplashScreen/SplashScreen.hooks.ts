import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateStore } from '@/stores/useUpdateStore';
import { useAppVersion } from '@/hooks/useAppVersion';
import type { SplashVariant } from '../SplashHero';
import type { ISplashStatusText } from '../SplashFooter';
import type { ISplashScreenProps, ISplashScreenView } from './SplashScreen.types';

/** Minimum time the splash screen stays visible (ms) */
const MIN_DISPLAY_MS = 1400;
/** Duration of the fade-out exit animation (ms) */
const EXIT_ANIMATION_MS = 600;
/** Delay before showing the footer status + progress (ms) */
const SPINNER_DELAY_MS = 600;
/** How often loading messages rotate (ms) */
const MESSAGE_ROTATE_MS = 1400;
/**
 * Don't start rotating prose until the splash has been visible for a bit —
 * avoids flicker on <1s loads where users barely see the first message.
 */
const MESSAGE_ROTATE_DELAY_MS = SPINNER_DELAY_MS * 2;

/**
 * Loading-message keys under `splash:messages.*`. Indexes are stable so the
 * random rotation maths still works after locale switches.
 */
const LOADING_MESSAGE_KEYS = [
  'stretching',
  'remote',
  'planning',
  'cookies',
  'checking',
  'nap',
  'almost',
  'plushies',
  'butterfly',
  'tea',
] as const;

function randomStartIndex() {
  return Math.floor(Math.random() * LOADING_MESSAGE_KEYS.length);
}

export function useSplashScreen({
  ready,
  error,
  onDismissed,
}: ISplashScreenProps): ISplashScreenView {
  const { t } = useTranslation('splash');
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(randomStartIndex);
  const version = useAppVersion<string | null>(null);
  const hasDismissedRef = useRef(false);

  const isInstalling = useUpdateStore(s => s.isInstalling);
  const updateInfo = useUpdateStore(s => s.updateInfo);

  // Variant resolution order: error wins over install (an error mid-install
  // still needs to be surfaced); otherwise install flips us to v3; otherwise
  // plain loading.
  const variant: SplashVariant = error ? 'error' : isInstalling ? 'updating' : 'loading';

  // While installing we want the splash to stay up (users just clicked
  // "install and restart" — the app will be gone in a moment and hiding the
  // splash would leave a jarring empty window). Treat the app as "not ready
  // to dismiss" for as long as the flag holds.
  const shouldDismiss = ready && minTimeElapsed && !isInstalling && !error;

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (variant !== 'loading') return;
    // Respect reduced-motion: pin the first message instead of swapping prose.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      interval = setInterval(
        () => setMessageIndex(i => (i + 1) % LOADING_MESSAGE_KEYS.length),
        MESSAGE_ROTATE_MS
      );
    }, MESSAGE_ROTATE_DELAY_MS);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [variant]);

  useEffect(() => {
    if (!shouldDismiss || hasDismissedRef.current) return;
    hasDismissedRef.current = true;
    setIsDismissing(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismissed?.();
    }, EXIT_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [shouldDismiss, onDismissed]);

  const message = useMemo(
    () => t(`messages.${LOADING_MESSAGE_KEYS[messageIndex]}`),
    [messageIndex, t]
  );

  const updatingTarget = updateInfo?.version ? `v${updateInfo.version}` : null;

  const statusText: ISplashStatusText | null =
    variant === 'updating'
      ? {
          action: t('status.installing'),
          target: updateInfo?.version ? `v${updateInfo.version}` : t('status.newVersionFallback'),
        }
      : null;

  const metaRight =
    variant === 'updating' ? t('status.restarting') : version ? `v${version}` : null;

  return {
    isVisible,
    isDismissing,
    variant,
    error,
    updatingTarget,
    showSpinner,
    message,
    messageIndex,
    statusText,
    metaRight,
    version,
    onRetry: () => window.location.reload(),
    onClose: () => window.close(),
  };
}
