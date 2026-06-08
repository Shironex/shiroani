import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  ExternalLink,
  Info,
  RefreshCw,
  RotateCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { useMalProfileStore } from '@/stores/useMalProfileStore';
import { useMalSyncStore } from '@/stores/useMalSyncStore';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import { tDynamic } from '@/lib/i18n';
import { ProfileSkeleton } from './ProfileSkeleton';
import { ProgressRing } from './ProgressRing';

const MAL_PROFILE_BASE = 'https://myanimelist.net/profile/';

/** The five MAL list statuses (the `statuses` array below sets display order). */
type MalStatusKey = 'watching' | 'completed' | 'onHold' | 'dropped' | 'planToWatch';

/**
 * Ring/segment colour per status, reusing the AniList dashboard's palette so the
 * two profile tabs read as one design (completed pink, watching blue, planning
 * gold, paused purple, dropped red).
 */
const STATUS_COLOR: Record<MalStatusKey, string> = {
  watching: 'oklch(0.7 0.15 220)',
  completed: 'oklch(0.74 0.15 355)',
  onHold: 'oklch(0.6 0.05 298)',
  dropped: 'oklch(0.65 0.18 25)',
  planToWatch: 'oklch(0.8 0.14 70)',
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

/**
 * "MyAnimeList" tab body. Mirrors the AniList tab's two-column
 * {@link ProfileDashboard} layout — a fixed sidebar (avatar + summary stats +
 * sync status + open-profile action) beside a scrollable main column — so the
 * two profile tabs read as one design. Fed by the desktop main process via
 * {@link MalEvents.GET_VIEWER_PROFILE} (token never crosses the socket).
 *
 * The stat set is deliberately lighter than AniList's: MAL's v2 API only exposes
 * ~15 scalars for `@me`, so there are no genre / voice-actor / score-distribution
 * breakdowns — the main column visualises the status counts and per-status day
 * counts instead.
 */
export function MalStatsPanel() {
  const { t, i18n } = useTranslation('profile');
  const profile = useMalProfileStore(s => s.profile);
  const isLoading = useMalProfileStore(s => s.isLoading);
  const error = useMalProfileStore(s => s.error);
  const fetchProfile = useMalProfileStore(s => s.fetchProfile);
  const navigateToBrowser = useNavigateToBrowser();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading && !profile) return <ProfileSkeleton />;
  if (error && !profile) return <AniListErrorState error={error} onRetry={() => fetchProfile()} />;
  if (!profile) return <ProfileSkeleton />;

  const locale = i18n.language;
  const { viewer } = profile;
  const numberFmt = (n: number) => n.toLocaleString(locale);
  const meanScore =
    profile.mean_score > 0
      ? profile.mean_score.toLocaleString(locale, { maximumFractionDigits: 2 })
      : '—';
  const profileUrl = `${MAL_PROFILE_BASE}${encodeURIComponent(viewer.name)}`;

  // One row per status, reused by the breakdown rings (counts → proportion) and
  // the time-investment bar (days). plan-to-watch carries no watch time, so its
  // day figure is always 0 and it drops out of the time section.
  const statuses: { key: MalStatusKey; count: number; days: number }[] = [
    { key: 'watching', count: profile.num_items_watching, days: profile.num_days_watching },
    { key: 'completed', count: profile.num_items_completed, days: profile.num_days_completed },
    { key: 'onHold', count: profile.num_items_on_hold, days: profile.num_days_on_hold },
    { key: 'dropped', count: profile.num_items_dropped, days: profile.num_days_dropped },
    { key: 'planToWatch', count: profile.num_items_plan_to_watch, days: 0 },
  ];
  // Guard the ring denominator: a brand-new account with an empty list has
  // num_items === 0, which would make every proportion NaN.
  const totalItems = profile.num_items || 1;
  const timeRows = statuses.filter(s => s.days > 0);
  const totalDays = timeRows.reduce((sum, s) => sum + s.days, 0);

  return (
    <div className="flex-1 flex min-h-0">
      {/* ── Sidebar (mirrors the AniList ProfileSidebar) ───────────── */}
      <aside className="w-[280px] shrink-0 border-r border-border-glass overflow-y-auto px-5 pt-6 pb-20 flex flex-col">
        {/* Avatar + handle + connected badge */}
        <div className="flex flex-col items-center pb-[18px] mb-4 border-b border-border-glass/60">
          {viewer.avatar ? (
            <img
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
          <div
            className={cn(
              'mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
              'bg-[oklch(0.45_0.14_220/0.18)] border border-[oklch(0.45_0.14_220/0.35)]',
              'font-mono text-[9.5px] tracking-[0.1em] uppercase text-[oklch(0.7_0.12_220)]'
            )}
          >
            <span
              aria-hidden="true"
              className="w-[5px] h-[5px] rounded-full bg-[oklch(0.7_0.12_220)] shadow-[0_0_6px_oklch(0.7_0.12_220)]"
            />
            {t('malPanel.sidebar.connectedBadge')}
          </div>
        </div>

        {/* Summary stat grid (2×2) */}
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">
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
              'w-full h-9 justify-start gap-2 px-3 text-[12px] font-medium',
              'bg-foreground/5 border border-foreground/10 text-foreground/90 hover:bg-foreground/10'
            )}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('malPanel.openProfile')}
          </Button>
        </div>
      </aside>

      {/* ── Main scroll column ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-7 pt-6 pb-24 flex flex-col gap-6">
        {/* Headline stat grid — status-focused, mirroring AniList's ProfileStatGrid */}
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

        {/* Library breakdown (status proportions) */}
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

        {/* Time invested (days per status) */}
        {totalDays > 0 && (
          <section>
            <SectionHead>{t('malPanel.time.title')}</SectionHead>
            <div className="space-y-3.5">
              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-foreground/[0.05]"
                role="img"
                aria-label={t('malPanel.time.barAria')}
              >
                {timeRows.map(s => (
                  <div
                    key={s.key}
                    className="h-full"
                    style={{
                      width: `${(s.days / totalDays) * 100}%`,
                      backgroundColor: STATUS_COLOR[s.key],
                    }}
                    title={`${t(STATUS_LABEL_KEY[s.key])} · ${formatDays(s.days, locale)}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {timeRows.map(s => (
                  <TimeCard
                    key={s.key}
                    color={STATUS_COLOR[s.key]}
                    label={t(STATUS_LABEL_KEY[s.key])}
                    value={`${formatDays(s.days, locale)} ${t('malPanel.time.daysUnit')}`}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* "lighter stat set" note */}
        <section className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-border-glass bg-foreground/[0.025]">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
          <p className="text-[11.5px] text-muted-foreground/80 leading-relaxed">
            {t('malPanel.lighterNote')}
          </p>
        </section>
      </div>
    </div>
  );
}

/**
 * Read-only MAL sync status, mirroring the AniList sidebar's widget. The trigger
 * lives confirm-gated in Settings → Accounts; a second un-gated trigger here
 * would be a hazard since sync mutates the live MAL account.
 */
function MalSyncStatusWidget() {
  const { t, i18n } = useTranslation('profile');
  const syncing = useMalSyncStore(s => s.syncing);
  const progress = useMalSyncStore(s => s.progress);
  const error = useMalSyncStore(s => s.error);
  const lastSyncedAt = useMalSyncStore(s => s.lastSyncedAt);

  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;

  let icon: React.ReactNode;
  let line: string;
  let tone: 'syncing' | 'error' | 'ok' | 'idle';

  if (syncing) {
    tone = 'syncing';
    icon = <RotateCw className="w-3 h-3 animate-spin" aria-hidden="true" />;
    line = progress
      ? t('sync.progress', { current: progress.current, total: progress.total })
      : t('sync.running');
  } else if (error) {
    tone = 'error';
    icon = <AlertCircle className="w-3 h-3" aria-hidden="true" />;
    line = tDynamic(i18n, error);
  } else if (lastSyncedAt) {
    tone = 'ok';
    icon = <CheckCircle2 className="w-3 h-3" aria-hidden="true" />;
    line = t('sync.lastSynced', {
      time: new Date(lastSyncedAt).toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  } else {
    tone = 'idle';
    icon = <RefreshCw className="w-3 h-3" aria-hidden="true" />;
    line = t('sync.idle');
  }

  return (
    <div
      className={cn(
        'mb-4 px-3 py-2.5 rounded-lg border',
        tone === 'error'
          ? 'bg-destructive/[0.06] border-destructive/25'
          : 'bg-foreground/3 border-border-glass'
      )}
      aria-live={syncing ? 'off' : 'polite'}
    >
      <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {t('malPanel.sidebar.syncHeading')}
      </div>
      <div
        className={cn(
          'flex items-center gap-1.5 text-[11.5px] leading-snug',
          tone === 'error' && 'text-destructive',
          tone === 'syncing' && 'text-primary',
          tone === 'ok' && 'text-foreground/80',
          tone === 'idle' && 'text-muted-foreground'
        )}
      >
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 truncate">{line}</span>
      </div>
      {syncing && (
        <div className="mt-2 h-1 rounded-full bg-foreground/7 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full bg-primary transition-[width] duration-500 ease-out',
              pct === null && 'animate-pulse'
            )}
            style={{ width: pct === null ? '100%' : `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-2.5 mb-3">
      <span>{children}</span>
      <span aria-hidden="true" className="flex-1 h-px bg-border-glass" />
    </h3>
  );
}

/** Compact 2-col summary stat in the sidebar (mirrors ProfileSidebar's SideStat). */
function SideStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-2.5 py-2 rounded-lg bg-foreground/3 border border-border-glass">
      <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="font-extrabold text-[18px] tracking-[-0.02em] text-foreground leading-none tabular-nums">
        {value}
        {sub && (
          <span className="ml-1 font-mono text-[10px] font-medium text-muted-foreground">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

/** Big 4-up headline stat card (mirrors ProfileStatGrid's StatCard). */
function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'accent' | 'gold';
}) {
  return (
    <div className="px-4 py-3.5 rounded-xl bg-foreground/[0.025] border border-border-glass">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div
        className={cn(
          'font-sans font-extrabold text-[28px] tracking-[-0.03em] leading-none tabular-nums',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-[oklch(0.8_0.14_70)]',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[11.5px] text-muted-foreground/80 mt-1">{sub}</div>}
    </div>
  );
}

/** Label/value row in the breakdown summary column (episodes · rewatched · days). */
function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'accent' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-glass/60 pb-2 last:border-0 last:pb-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
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
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <div className="font-sans font-extrabold text-[18px] tracking-[-0.02em] tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}
