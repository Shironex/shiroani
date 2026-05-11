import { useTranslation } from 'react-i18next';
import { MASCOT_WAVE_URL, MASCOT_SLEEP_URL } from '@/lib/constants';
import { SpinnerRing } from '@/components/ui/spinner-ring';
import { cn } from '@/lib/utils';

export type SplashVariant = 'loading' | 'updating' | 'error';

interface SplashHeroProps {
  variant?: SplashVariant;
  errorMessage?: string | null;
  /**
   * Optional target label shown under the wordmark for the `updating`
   * variant (e.g. the incoming version string: `aktualizacja · v0.6.0`).
   */
  updatingTarget?: string | null;
}

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
    wordmarkEmClass: 'text-[var(--status-info)]',
    subClass: 'text-[color:oklch(from_var(--status-info)_l_c_h/0.85)]',
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

export function SplashHero({ variant = 'loading', errorMessage, updatingTarget }: SplashHeroProps) {
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

  const mascotImg = (
    <img
      src={config.mascot}
      alt={t('mascotAlt')}
      className={cn(
        'w-36 h-36 object-contain drop-shadow-lg',
        config.animateMascot && 'animate-[splash-pulse_2.4s_ease-in-out_infinite]'
      )}
      draggable={false}
    />
  );

  return (
    <div className="relative flex flex-col items-center justify-center gap-5 px-8 text-center animate-[splash-fade-up_0.8s_ease-out_both]">
      {config.showRing ? (
        <SpinnerRing size={200} tone={config.tone}>
          {mascotImg}
        </SpinnerRing>
      ) : (
        <div className="w-[200px] h-[200px] grid place-items-center">{mascotImg}</div>
      )}

      <div className="flex flex-col items-center gap-1.5 animate-[splash-fade-up_0.8s_ease-out_0.2s_both]">
        <div className="font-serif text-[34px] font-extrabold leading-none tracking-[-0.02em] text-foreground">
          Shiro
          <em className={cn('italic', config.wordmarkEmClass)}>Ani</em>
        </div>
        <div className={cn('font-mono text-[10.5px] uppercase tracking-[0.28em]', config.subClass)}>
          {subText}
        </div>
      </div>

      {isError && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground animate-[splash-fade-up_0.6s_ease-out_0.4s_both]">
          {looksLikeNetworkError(errorMessage) ? t('error.offline') : t('error.generic')}
        </p>
      )}
    </div>
  );
}
