import { useTranslation } from 'react-i18next';
import { User, RefreshCw, Share2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { formatDays, useDaysLabel, formatScoreOutOf10, formatCount } from '../profile-constants';
import { SideStat, ConnectedBadge } from '../shared-parts';
import { useProfileSidebar } from './ProfileSidebar.hooks';
import { SyncStatusWidget } from './ProfileSidebar.parts';
import type { IProfileSidebarProps } from './ProfileSidebar.types';

/**
 * Left column of the Profile view — avatar, handle, headline metrics,
 * and connection actions (refresh / share / disconnect).
 *
 * Mirrors `.prof-side` + `.avatar-wrap` + `.side-stats` + `.side-actions`
 * from shiroani-design/Profile.html.
 */
export default function ProfileSidebar({
  profile,
  isLoading,
  onRefresh,
  onShare,
  onDisconnect,
}: IProfileSidebarProps) {
  const { t } = useTranslation('profile');
  const daysLabel = useDaysLabel();
  const { stats, language, memberSince, daysActive, daysActiveLabel } = useProfileSidebar({
    profile,
  });

  return (
    <aside className="w-[280px] shrink-0 border-r border-border-glass overflow-y-auto px-5 pt-6 pb-20 flex flex-col">
      {/* ── Avatar + handle + badge ─────────────────────────── */}
      <div className="flex flex-col items-center pb-[18px] mb-4 border-b border-border-glass/60 relative">
        {profile.avatar ? (
          <FadeInImage
            src={profile.avatar}
            alt={t('avatarAlt', { name: profile.name })}
            className={cn(
              'w-20 h-20 rounded-full object-cover',
              'border-2 border-primary/40',
              'shadow-[0_0_24px_oklch(from_var(--primary)_l_c_h/0.3)]',
              'mb-2.5'
            )}
            draggable={false}
          />
        ) : (
          <div
            className={cn(
              'w-20 h-20 rounded-full grid place-items-center mb-2.5',
              'bg-gradient-to-br from-primary/60 to-primary/30',
              'border-2 border-primary/40',
              'shadow-[0_0_24px_oklch(from_var(--primary)_l_c_h/0.3)]',
              'font-serif font-extrabold text-[28px] text-foreground'
            )}
          >
            {profile.name.charAt(0).toUpperCase() || <User className="w-8 h-8" />}
          </div>
        )}
        <div className="font-sans font-extrabold text-[16px] tracking-[-0.01em] text-foreground truncate max-w-full">
          {profile.name}
        </div>
        <div className="font-mono text-[10.5px] tracking-[0.18em] text-muted-foreground mt-0.5 truncate max-w-full">
          @{profile.name.toLowerCase()}
        </div>
        <ConnectedBadge label={t('sidebar.connectedBadge')} />
        {memberSince && (
          <div className="mt-2 text-[10.5px] text-muted-foreground/70">
            {t('sidebar.memberSince', { date: memberSince })}
          </div>
        )}
        {daysActive > 0 && (
          <div
            className={cn(
              'mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
              'bg-primary/15 border border-primary/30',
              'font-mono text-2xs tracking-[0.1em] uppercase text-primary'
            )}
          >
            <span
              aria-hidden="true"
              className="w-[5px] h-[5px] rounded-full bg-primary shadow-[0_0_6px_oklch(from_var(--primary)_l_c_h)]"
            />
            {t('sidebar.shiroAniBadge', { value: daysActiveLabel })}
          </div>
        )}
      </div>

      {/* ── Summary stat grid (2×2) ─────────────────────────── */}
      <div className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
        {t('sidebar.summaryHeading')}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <SideStat label={t('sidebar.stats.anime')} value={formatCount(stats.count, language)} />
        <SideStat
          label={t('sidebar.stats.episodes')}
          value={formatCount(stats.episodesWatched, language)}
        />
        <SideStat
          label={daysLabel(stats.minutesWatched)}
          value={formatDays(stats.minutesWatched)}
        />
        <SideStat
          label={t('sidebar.stats.meanScore')}
          value={formatScoreOutOf10(stats.meanScore)}
          sub="/10"
        />
      </div>

      {/* ── AniList sync status widget ───────────────────────── */}
      <SyncStatusWidget />

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 mt-auto pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            'h-9 justify-start gap-2 px-3 text-xs font-medium',
            'bg-primary/15 border border-primary/30 text-primary',
            'hover:bg-primary/20 hover:text-primary'
          )}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          {t('sidebar.actions.refresh')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onShare}
          className={cn(
            'h-9 justify-start gap-2 px-3 text-xs font-medium',
            'bg-foreground/5 border border-foreground/10 text-foreground/90',
            'hover:bg-foreground/10'
          )}
        >
          <Share2 className="w-3.5 h-3.5" />
          {t('sidebar.actions.exportPng')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDisconnect}
          className={cn(
            'h-9 justify-start gap-2 px-3 text-xs font-medium',
            'bg-foreground/5 border border-foreground/10 text-muted-foreground',
            'hover:bg-destructive/15 hover:text-destructive hover:border-destructive/30'
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          {t('sidebar.actions.disconnect')}
        </Button>
      </div>
    </aside>
  );
}
