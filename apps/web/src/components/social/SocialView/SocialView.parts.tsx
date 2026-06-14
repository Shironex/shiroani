import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { SocialActivityRow } from '../SocialActivityRow';
import type { ISocialViewView } from './SocialView.types';

const SKELETON_ROWS = [0, 1, 2, 3, 4];

type SocialBodyProps = Pick<
  ISocialViewView,
  'connected' | 'activities' | 'isLoading' | 'error' | 'onRetry'
>;

/** The feed body: connect prompt, error, skeletons, empty state, or rows. */
export function SocialBody({ connected, activities, isLoading, error, onRetry }: SocialBodyProps) {
  const { t } = useTranslation('social');

  // Feed is viewer-scoped: without a connected account there's nothing to fetch.
  if (!connected) {
    return <SocialEmpty message={t('feed.notConnected')} />;
  }

  if (error) {
    return <AniListErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5" aria-busy="true" aria-label={t('feed.loadingAria')}>
        {SKELETON_ROWS.map(i => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return <SocialEmpty message={t('feed.empty')} />;
  }

  return (
    <div className="flex flex-col gap-1.5 max-w-2xl mx-auto">
      {activities.map(item => (
        <SocialActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60 max-w-2xl mx-auto w-full">
      <div className="w-10 h-14 shrink-0 rounded-md bg-foreground/5 animate-pulse" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-2.5 w-1/3 rounded bg-foreground/5 animate-pulse" />
        <div className="h-3 w-2/5 rounded bg-foreground/5 animate-pulse" />
        <div className="h-2.5 w-1/4 rounded bg-foreground/5 animate-pulse" />
      </div>
    </div>
  );
}

function SocialEmpty({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2.5 rounded-xl px-5 py-8 text-center',
          'border border-border-glass bg-foreground/3 max-w-md'
        )}
      >
        <div className="grid place-items-center w-9 h-9 rounded-xl border border-border-glass bg-foreground/5 text-muted-foreground/60">
          <Users className="w-4 h-4" aria-hidden="true" />
        </div>
        <p className="text-[12px] text-muted-foreground/70 leading-snug max-w-[40ch]">{message}</p>
      </div>
    </div>
  );
}
