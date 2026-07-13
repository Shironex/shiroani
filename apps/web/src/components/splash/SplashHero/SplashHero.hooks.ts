import { useTranslation } from 'react-i18next';
import { MASCOT_WAVE_URL, MASCOT_SLEEP_URL } from '@/lib/constants';
import type { ISplashHeroProps, ISplashHeroView, SplashVariant } from './SplashHero.types';

type VariantConfig = {
  tone: 'primary' | 'info' | 'destructive';
  mascot: string;
  /** Show the mascot pulse animation (disabled on updating / error per mock). */
  animateMascot: boolean;
  /** Render the rotating ring. Hidden on error per mock. */
  showRing: boolean;
  wordmarkEmClass: string;
  subClass: string;
  /** i18n key under `splash:subtitle.*` for the default fallback sub. */
  defaultSubKey: 'loading' | 'updating' | 'errorOffline';
};

const VARIANT_CONFIG: Record<SplashVariant, VariantConfig> = {
  loading: {
    tone: 'primary',
    mascot: MASCOT_WAVE_URL,
    animateMascot: true,
    showRing: true,
    wordmarkEmClass: 'text-primary',
    subClass: 'text-muted-foreground/80',
    defaultSubKey: 'loading',
  },
  updating: {
    tone: 'info',
    mascot: MASCOT_SLEEP_URL,
    animateMascot: false,
    showRing: true,
    wordmarkEmClass: 'text-status-info',
    subClass: 'text-status-info/85',
    defaultSubKey: 'updating',
  },
  error: {
    tone: 'destructive',
    mascot: MASCOT_SLEEP_URL,
    animateMascot: false,
    showRing: false,
    wordmarkEmClass: 'text-destructive',
    subClass: 'text-destructive/85',
    defaultSubKey: 'errorOffline',
  },
};

/**
 * Heuristic: does the error message look like a network / connection failure?
 * We keep the "brak połączenia" sub only for those; everything else gets a
 * generic "coś poszło nie tak" tagline so the mock's offline pill doesn't
 * mislead users about the actual cause.
 *
 * Tokens are chosen to be narrow enough that ordinary words like "report",
 * "import", or "backend_id" don't trigger a false network classification.
 */
const NETWORK_SUBSTRINGS = [
  'network',
  'fetch',
  'socket',
  'econn',
  'enotfound',
  'enetunreach',
  'etimedout',
  'unreachable',
  'offline',
  'timeout',
];
const NETWORK_REGEXES = [
  /\bconnect(ion|ed|ing)?\b/, // "connection", "connecting" — not "reconnected-log" substrings
  /\bport\b/, // word-boundary so "reports" / "import" don't match
  /\bbackend\b/,
];

function looksLikeNetworkError(message: string | null | undefined): boolean {
  if (!message) return true; // no detail — safest to assume network
  const m = message.toLowerCase();
  if (NETWORK_SUBSTRINGS.some(token => m.includes(token))) return true;
  return NETWORK_REGEXES.some(rx => rx.test(m));
}

export function useSplashHero({
  variant = 'loading',
  errorMessage,
  updatingTarget,
}: ISplashHeroProps): ISplashHeroView {
  const { t } = useTranslation('splash');
  const config = VARIANT_CONFIG[variant];
  const isError = variant === 'error';
  const isUpdating = variant === 'updating';

  const subText = (() => {
    if (isError) {
      return looksLikeNetworkError(errorMessage)
        ? t(`subtitle.${config.defaultSubKey}`)
        : t('subtitle.errorGeneric');
    }
    if (isUpdating && updatingTarget)
      return t('subtitle.updatingTarget', { target: updatingTarget });
    return t(`subtitle.${config.defaultSubKey}`);
  })();

  const errorText = looksLikeNetworkError(errorMessage) ? t('error.offline') : t('error.generic');

  return {
    isError,
    mascotSrc: config.mascot,
    animateMascot: config.animateMascot,
    showRing: config.showRing,
    tone: config.tone,
    wordmarkEmClass: config.wordmarkEmClass,
    subClass: config.subClass,
    subText,
    mascotAlt: t('mascotAlt'),
    errorText,
  };
}
