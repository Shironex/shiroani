import { useTranslation } from 'react-i18next';
import { MASCOT_SLEEP_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { SpinnerRing } from '@/components/ui/spinner-ring';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';

/**
 * Functional fallback so the class boundary can use the i18n hook.
 * Kept colocated since it's tightly coupled to {@link ErrorBoundary}'s
 * recovery handlers.
 */
export function ErrorFallback({
  error,
  onRestart,
  onReset,
}: {
  error: Error | null;
  onRestart: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation('errorBoundary');
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground overflow-hidden">
      {/* Dual radial glow — matches splash-v5 ambient shell. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 55% 40% at 25% 20%, var(--glow-1), transparent 60%)',
            'radial-gradient(ellipse 50% 55% at 90% 95%, oklch(from var(--destructive) l c h / 0.18), transparent 55%)',
          ].join(','),
        }}
      />

      <KanjiWatermark kanji="失" position="tr" size={320} opacity={0.04} />

      <div className="relative flex flex-col items-center gap-5 text-center">
        <SpinnerRing size={180} tone="destructive">
          <img
            src={MASCOT_SLEEP_URL}
            alt={t('mascotAlt')}
            className="w-32 h-32 object-contain drop-shadow-lg"
            draggable={false}
          />
        </SpinnerRing>

        <div className="flex flex-col items-center gap-1.5">
          <div className="font-serif text-[32px] font-extrabold leading-none tracking-[-0.02em] text-foreground">
            Shiro<em className="italic text-destructive">Ani</em>
          </div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-destructive/85">
            {t('kicker')}
          </div>
        </div>

        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{t('description')}</p>

        {error && (
          <details className="group max-w-md w-full text-left">
            <summary className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/70 hover:text-muted-foreground transition-colors select-none">
              {t('technicalDetails')}
            </summary>
            <pre className="mt-2 p-3 rounded-lg bg-muted/40 border border-border-glass text-xs text-muted-foreground overflow-auto max-h-40">
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onRestart}>
            {t('restart')}
          </Button>
          <Button type="button" size="sm" onClick={onReset}>
            {t('retry')}
          </Button>
        </div>
      </div>
    </div>
  );
}
