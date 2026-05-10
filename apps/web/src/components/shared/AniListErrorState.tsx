import { CloudOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { classifyAniListError } from '@shiroani/shared';
import { Button } from '@/components/ui/button';
import { tDynamic } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface AniListErrorStateProps {
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

const KIND_KEY: Record<ReturnType<typeof classifyAniListError>, string> = {
  'api-disabled': 'apiDisabled',
  'rate-limit': 'rateLimit',
  network: 'network',
  unknown: 'unknown',
};

export function AniListErrorState({ error, onRetry, className }: AniListErrorStateProps) {
  const { t, i18n } = useTranslation('nav');
  if (!error) return null;

  const kind = classifyAniListError(error);
  const groupKey = KIND_KEY[kind];
  const title = tDynamic(i18n, `nav:anilistError.${groupKey}.title`);
  const subtitle = tDynamic(i18n, `nav:anilistError.${groupKey}.subtitle`);
  const body = kind === 'unknown' ? error : subtitle;

  return (
    <div className={cn('flex items-center justify-center w-full h-full px-6 py-12', className)}>
      <div className="relative w-full max-w-md rounded-xl border border-destructive/25 bg-destructive/[0.06] backdrop-blur-sm overflow-hidden">
        <ErrorStage />
        <div className="px-5 py-4 space-y-3 text-center">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-[16px] leading-tight tracking-[-0.01em] text-destructive">
              {title}
            </h3>
            {body && (
              <p className="text-[12px] text-muted-foreground leading-snug break-words">{body}</p>
            )}
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5" />
              {t('anilistError.retry')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorStage() {
  return (
    <div
      className="relative overflow-hidden border-b border-destructive/15"
      style={{
        height: 140,
        background:
          'linear-gradient(135deg, oklch(0.14 0.02 300), oklch(0.1 0.02 280)), radial-gradient(circle at 50% 50%, oklch(0.55 0.18 25 / 0.22), transparent 60%)',
        backgroundBlendMode: 'overlay',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative size-20">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-destructive/25 animate-ping"
            style={{ animationDuration: '2.4s' }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-2 rounded-full bg-destructive/20 animate-ping"
            style={{ animationDuration: '2.4s', animationDelay: '0.6s' }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <div className="size-14 rounded-full bg-destructive/20 border border-destructive/40 grid place-items-center shadow-[0_8px_24px_oklch(0.55_0.18_25_/_0.25)]">
              <CloudOff className="size-7 text-destructive" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
