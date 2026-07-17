import { useTranslation } from 'react-i18next';
import { User, ExternalLink } from 'lucide-react';
import type { MalUserStats } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { Eyebrow } from '@/components/shared/Eyebrow';
import { useMalSyncStore } from '@/stores/useMalSyncStore';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import { ProgressRing } from '../ProgressRing';
import { SectionHead, SideStat, StatCard, ConnectedBadge, SyncStatusWidget } from '../shared-parts';
import { formatCount } from '../profile-constants';
import type { IMalStatusRow, MalStatusKey } from './MalStatsPanel.types';

const MAL_PROFILE_BASE = 'https://myanimelist.net/profile/';

/**
 * Ring/segment colour per status, mapped to the semantic status palette so the
 * two profile tabs read as one design (completed→success, watching→info,
 * planning→warning, dropped→error). On-hold has no status token, so it borrows
 * the categorical chart-5 hue.
 */
const STATUS_COLOR: Record<MalStatusKey, string> = {
  watching: 'var(--status-info)',
  completed: 'var(--status-success)',
  onHold: 'var(--chart-5)',
  dropped: 'var(--status-error)',
  planToWatch: 'var(--status-warning)',
};

/**
 * Status label keys as a closed map so the literal-key `t()` overload accepts the
 * lookup without the `tDynamic` escape hatch (mirrors ProfileView's TAB_LABEL_KEY).
 */
const STATUS_LABEL_KEY = {
  watching: 'malPanel.status.watching',
  completed: 'malPanel.status.completed',
  onHold: 'malPanel.status.onHold',
  dropped: 'malPanel.status.dropped',
  planToWatch: 'malPanel.status.planToWatch',
} as const satisfies Record<MalStatusKey, string>;

/** Format MAL's fractional day counts to one decimal place, locale-aware. */
function formatDays(days: number, locale: string): string {
  return days.toLocaleString(locale, { maximumFractionDigits: 1 });
}

function buildStatusRows(profile: MalUserStats): IMalStatusRow[] {
  // plan-to-watch carries no watch time, so its day figure is always 0 and it
  // drops out of the time section.
  return [
    { key: 'watching', count: profile.num_items_watching, days: profile.num_days_watching },
    { key: 'completed', count: profile.num_items_completed, days: profile.num_days_completed },
    { key: 'onHold', count: profile.num_items_on_hold, days: profile.num_days_on_hold },
    { key: 'dropped', count: profile.num_items_dropped, days: profile.num_days_dropped },
    { key: 'planToWatch', count: profile.num_items_plan_to_watch, days: 0 },
  ];
}

// ── Sidebar ──────────────────────────────────────────────────────────────

/** Left column, mirroring the AniList ProfileSidebar. */
export function MalSidebar({ profile, locale }: { profile: MalUserStats; locale: string }) {
  const { t } = useTranslation(['profile', 'common']);
  const navigateToBrowser = useNavigateToBrowser();
  const { viewer } = profile;
  const numberFmt = (n: number) => formatCount(n, locale);
  const meanScore =
    profile.mean_score > 0
      ? profile.mean_score.toLocaleString(locale, { maximumFractionDigits: 2 })
      : '—';
  const profileUrl = `${MAL_PROFILE_BASE}${encodeURIComponent(viewer.name)}`;

  return (
    <aside className="w-[280px] shrink-0 border-r border-border-glass overflow-y-auto px-5 pt-6 pb-20 flex flex-col">
      {/* Avatar + handle + connected badge */}
      <div className="flex flex-col items-center pb-[18px] mb-4 border-b border-border-glass/60">
        {viewer.avatar ? (
          <FadeInImage
            src={viewer.avatar}
            alt=""
            className={cn(
              'w-20 h-20 rounded-full object-cover mb-2.5',
              'border-2 border-primary/40',
              'shadow-[0_0_24px_oklch(from_var(--primary)_l_c_h/0.3)]'
            )}
            draggable={false}
          />
        ) : (
          <div
            className={cn(
              'w-20 h-20 rounded-full grid place-items-center mb-2.5',
              'bg-gradient-to-br from-primary/60 to-primary/30 border-2 border-primary/40',
              'shadow-[0_0_24px_oklch(from_var(--primary)_l_c_h/0.3)]',
              'font-serif font-extrabold text-[28px] text-foreground'
            )}
          >
            {viewer.name.charAt(0).toUpperCase() || <User className="w-8 h-8" />}
          </div>
        )}
        <div className="font-sans font-extrabold text-[16px] tracking-[-0.01em] text-foreground truncate max-w-full">
          {viewer.name}
        </div>
        <ConnectedBadge label={t('malPanel.sidebar.connectedBadge')} />
      </div>

      {/* Summary stat grid (2×2) */}
      <div className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
        {t('sidebar.summaryHeading')}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <SideStat label={t('sidebar.stats.anime')} value={numberFmt(profile.num_items)} />
        <SideStat label={t('sidebar.stats.episodes')} value={numberFmt(profile.num_episodes)} />
        <SideStat
          label={t('malPanel.counters.daysWatched')}
          value={formatDays(profile.num_days_watched, locale)}
        />
        <SideStat label={t('sidebar.stats.meanScore')} value={meanScore} sub="/10" />
      </div>

      {/* MAL sync status (read-only; the trigger lives in Settings → Accounts) */}
      <MalSyncStatusWidget />

      {/* Open on MAL — pinned to the bottom like the AniList actions */}
      <div className="mt-auto pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToBrowser(profileUrl)}
          className={cn(
            'w-full h-9 justify-start gap-2 px-3 text-xs font-medium',
            'bg-foreground/5 border border-foreground/10 text-foreground/90 hover:bg-foreground/10'
          )}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t('malPanel.openProfile')}
        </Button>
      </div>
    </aside>
  );
}

// ── Main column sections ─────────────────────────────────────────────────

/** Headline stat grid — status-focused, mirroring AniList's ProfileStatGrid. */
export function MalHeadlineStats({ profile, locale }: { profile: MalUserStats; locale: string }) {
  const { t } = useTranslation('profile');
  const numberFmt = (n: number) => formatCount(n, locale);
  const meanScore =
    profile.mean_score > 0
      ? profile.mean_score.toLocaleString(locale, { maximumFractionDigits: 2 })
      : '—';

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label={t('malPanel.status.completed')}
        value={numberFmt(profile.num_items_completed)}
        tone="accent"
      />
      <StatCard
        label={t('malPanel.status.watching')}
        value={numberFmt(profile.num_items_watching)}
      />
      <StatCard
        label={t('malPanel.status.planToWatch')}
        value={numberFmt(profile.num_items_plan_to_watch)}
      />
      <StatCard
        label={t('malPanel.counters.meanScore')}
        value={meanScore}
        sub={t('malPanel.counters.meanScoreSub')}
        tone="gold"
      />
    </section>
  );
}

/** Library breakdown (status proportions) — rings + summary column. */
export function MalBreakdownSection({
  profile,
  locale,
}: {
  profile: MalUserStats;
  locale: string;
}) {
  const { t } = useTranslation('profile');
  const numberFmt = (n: number) => formatCount(n, locale);
  const statuses = buildStatusRows(profile);
  // Guard the ring denominator: a brand-new account with an empty list has
  // num_items === 0, which would make every proportion NaN.
  const totalItems = profile.num_items || 1;

  return (
    <section>
      <SectionHead>{t('malPanel.breakdown.title')}</SectionHead>
      <div className="flex gap-5 items-center flex-wrap">
        {statuses.map(s => (
          <ProgressRing
            key={s.key}
            value={(s.count / totalItems) * 100}
            stroke={STATUS_COLOR[s.key]}
            label={t(STATUS_LABEL_KEY[s.key])}
            valueLabel={`${Math.round((s.count / totalItems) * 100)}%`}
          />
        ))}
        {/* Summary column mirrors the AniList dashboard's breakdown layout. */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-2.5 px-1">
          <SummaryRow
            label={t('malPanel.counters.episodes')}
            value={numberFmt(profile.num_episodes)}
          />
          <SummaryRow
            label={t('malPanel.breakdown.rewatched')}
            value={numberFmt(profile.num_times_rewatched)}
            tone="accent"
          />
          <SummaryRow
            label={t('malPanel.counters.daysWatched')}
            value={formatDays(profile.num_days_watched, locale)}
          />
        </div>
      </div>
    </section>
  );
}

/** Time invested (days per status) — proportional bar + per-status cards. */
export function MalTimeSection({ profile, locale }: { profile: MalUserStats; locale: string }) {
  const { t } = useTranslation('profile');
  const timeRows = buildStatusRows(profile).filter(s => s.days > 0);
  const totalDays = timeRows.reduce((sum, s) => sum + s.days, 0);

  if (totalDays <= 0) return null;

  return (
    <section>
      <SectionHead>{t('malPanel.time.title')}</SectionHead>
      <div className="space-y-3.5">
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-foreground/[0.05]"
          role="img"
          aria-label={t('malPanel.time.barAria')}
        >
          {timeRows.map(s => (
            <Tooltip key={s.key}>
              <TooltipTrigger asChild>
                <div
                  className="h-full"
                  style={{
                    width: `${(s.days / totalDays) * 100}%`,
                    backgroundColor: STATUS_COLOR[s.key],
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">
                {`${t(STATUS_LABEL_KEY[s.key])} · ${formatDays(s.days, locale)}`}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {timeRows.map(s => (
            <TimeCard
              key={s.key}
              color={STATUS_COLOR[s.key]}
              label={t(STATUS_LABEL_KEY[s.key])}
              value={t('malPanel.time.daysValue', {
                count: s.days,
                value: formatDays(s.days, locale),
              })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Read-only sync widget ────────────────────────────────────────────────

/**
 * Read-only MAL sync status, mirroring the AniList sidebar's widget. The trigger
 * lives confirm-gated in Settings → Accounts; a second un-gated trigger here
 * would be a hazard since sync mutates the live MAL account.
 */
function MalSyncStatusWidget() {
  const { t } = useTranslation('profile');
  const syncing = useMalSyncStore(s => s.syncing);
  const progress = useMalSyncStore(s => s.progress);
  const error = useMalSyncStore(s => s.error);
  const lastSyncedAt = useMalSyncStore(s => s.lastSyncedAt);

  return (
    <SyncStatusWidget
      heading={t('malPanel.sidebar.syncHeading')}
      syncing={syncing}
      progress={progress}
      error={error}
      lastSyncedAt={lastSyncedAt}
    />
  );
}

// ── Small presentational cards ───────────────────────────────────────────

/** Label/value row in the breakdown summary column (episodes · rewatched · days). */
function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'accent' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-glass/60 pb-2 last:border-0 last:pb-0">
      <Eyebrow>{label}</Eyebrow>
      <span
        className={cn(
          'font-sans font-extrabold text-[16px] tracking-[-0.02em] tabular-nums',
          tone === 'accent' ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Per-status day-count card (colour dot + status + days) in the time section. */
function TimeCard({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-foreground/[0.025] border border-border-glass">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          aria-hidden="true"
          className="size-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <Eyebrow className="truncate">{label}</Eyebrow>
      </div>
      <div className="font-sans font-extrabold text-[18px] tracking-[-0.02em] tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}
