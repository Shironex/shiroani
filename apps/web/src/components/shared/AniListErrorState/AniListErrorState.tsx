import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { classifyAniListError } from '@shiroani/shared';
import { Button } from '@/components/ui/button';
import { tDynamic } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAniListErrorState } from './AniListErrorState.hooks';
import { ErrorStage } from './AniListErrorState.parts';
import type { IAniListErrorStateProps } from './AniListErrorState.types';

const KIND_KEY: Record<ReturnType<typeof classifyAniListError>, string> = {
  'api-disabled': 'apiDisabled',
  'rate-limit': 'rateLimit',
  network: 'network',
  unknown: 'unknown',
};

export default function AniListErrorState({ error, onRetry, className }: IAniListErrorStateProps) {
  const { t, i18n } = useTranslation('nav');
  useAniListErrorState();

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
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              {t('anilistError.retry')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
