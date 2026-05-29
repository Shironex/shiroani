import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Flame,
  CalendarDays,
  Tag as TagIcon,
  Sparkles,
  Clapperboard,
  Building2,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createLocalStorageAccessor } from '@/lib/persisted-storage';
import { StatCell } from '@/components/shared/StatCell';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { PillTag } from '@/components/ui/pill-tag';
import { ComingSoonPlaceholder } from '@/components/shared/ComingSoonPlaceholder';
import { GenreBreakdown } from '@/components/profile/GenreBreakdown';
import { StudioBreakdown } from '@/components/profile/StudioBreakdown';
import { useDiaryBreakdowns } from '@/hooks/useDiaryBreakdowns';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import { type DiaryEntry } from '@shiroani/shared';

interface DiarySidebarProps {
  entries: DiaryEntry[];
}

interface DiaryStats {
  total: number;
  thisMonth: number;
  currentStreak: number;
  longestStreak: number;
  linkedToAnime: number;
  topTags: { tag: string; count: number }[];
  activeDaysByWeekOfYear: number[]; // 53 weeks, count per week
  maxWeekCount: number;
}

// Bucket by local calendar day so streaks don't flip a day early/late for
// users in non-UTC timezones. Always use local-time components — never
// toISOString, which returns UTC.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function computeStats(entries: DiaryEntry[]): DiaryStats {
  const total = entries.length;

  // Unique days (active days)
  const activeDays = new Set<string>();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let thisMonth = 0;
  let linkedToAnime = 0;
  const tagCounts = new Map<string, number>();

  // 53 weeks of activity (current ISO-ish week + 52 prior)
  const weeks: number[] = new Array(53).fill(0);
  const yearMs = 365 * 24 * 60 * 60 * 1000;
  const startOfRange = new Date(now.getTime() - yearMs);

  for (const e of entries) {
    const d = new Date(e.createdAt);
    activeDays.add(dayKey(d));
    if (d >= monthStart) thisMonth++;
    if (e.animeId != null) linkedToAnime++;
    if (e.tags) {
      for (const t of e.tags) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }
    if (d >= startOfRange) {
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
      const weekIdx = 52 - Math.floor(diffDays / 7);
      if (weekIdx >= 0 && weekIdx < 53) {
        weeks[weekIdx] = (weeks[weekIdx] ?? 0) + 1;
      }
    }
  }

  // Compute current streak (consecutive days ending today or yesterday)
  const todayKey = dayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);

  let currentStreak = 0;
  const hasToday = activeDays.has(todayKey);
  const hasYesterday = activeDays.has(yesterdayKey);
  if (hasToday || hasYesterday) {
    const cursor = new Date(hasToday ? now : yesterday);
    while (activeDays.has(dayKey(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Longest streak — walk sorted unique day list
  const sortedDays = Array.from(activeDays)
    .map(k => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m - 1, d).getTime();
    })
    .sort((a, b) => a - b);
  let longestStreak = 0;
  let run = 0;
  let prev = -1;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  for (const ts of sortedDays) {
    if (prev !== -1 && ts - prev === ONE_DAY) {
      run++;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = ts;
  }

  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const maxWeekCount = weeks.reduce((m, c) => (c > m ? c : m), 0);

  return {
    total,
    thisMonth,
    currentStreak,
    longestStreak,
    linkedToAnime,
    topTags,
    activeDaysByWeekOfYear: weeks,
    maxWeekCount,
  };
}

// Streak lengths that earn a one-time celebration (toast + badge). A subset of
// the progress-bar milestones below — the early, achievable ones worth a payoff.
const CELEBRATION_MILESTONES = [7, 14, 30] as const;

const CELEBRATED_MILESTONES_STORAGE_KEY = 'shiroani:diaryCelebratedStreaks';

// Persist which milestones already fired so the toast doesn't re-trigger on
// every mount (or for a user who's already long past a milestone).
const celebratedMilestonesStorage = createLocalStorageAccessor<Set<number>>(
  CELEBRATED_MILESTONES_STORAGE_KEY,
  {
    parse: raw => {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      const out = new Set<number>();
      for (const v of parsed) {
        if (typeof v === 'number' && Number.isFinite(v)) out.add(v);
      }
      return out;
    },
    serialize: ids => JSON.stringify(Array.from(ids)),
    fallback: new Set(),
  }
);

const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365];
function nextStreakMilestone(streak: number): { target: number; progress: number } {
  const target =
    STREAK_MILESTONES.find(m => m > streak) ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1]!;
  const prev = STREAK_MILESTONES.filter(m => m <= streak).pop() ?? 0;
  const span = target - prev;
  const progress = span > 0 ? ((streak - prev) / span) * 100 : 100;
  return { target, progress: Math.max(0, Math.min(100, progress)) };
}

/**
 * Right-hand panel on the Diary view — assembles the motivational side surface
 * described in the redesign mock: streak card, 2×2 stat grid, activity
 * heatmap and popular tags. All values are derived from the currently loaded
 * entries (no network calls).
 */
export function DiarySidebar({ entries }: DiarySidebarProps) {
  const { t } = useTranslation('diary');
  const stats = useMemo(() => computeStats(entries), [entries]);
  const milestone = nextStreakMilestone(stats.currentStreak);

  // Fire a one-time celebration when the streak reaches 7 / 14 / 30 days. The
  // persisted set guarantees once-per-milestone across sessions, so any
  // milestone already recorded never re-fires — no extra mount guard needed.
  const celebratedRef = useRef<Set<number>>(celebratedMilestonesStorage.get());
  useEffect(() => {
    const streak = stats.currentStreak;
    const celebrated = celebratedRef.current;
    const reached = CELEBRATION_MILESTONES.filter(m => streak >= m && !celebrated.has(m));
    if (reached.length === 0) return;

    for (const m of reached) celebrated.add(m);
    celebratedMilestonesStorage.set(celebrated);

    const top = reached[reached.length - 1]!;
    toast.success(t('sidebar.celebration.title', { count: top }), {
      description: t('sidebar.celebration.description'),
      icon: '🔥',
    });
  }, [stats.currentStreak, t]);

  // Prime the AniList-detail cache so the genre/studio breakdowns can populate.
  // Walks diary entries → library entries → anilistIds once, fires parallel
  // GET_DETAILS for anything not already cached / in-flight / known-failed.
  const libraryEntries = useLibraryStore(s => s.entries);
  const ensureDetails = useAnimeDetailStore(s => s.ensureDetails);
  const animeDetails = useAnimeDetailStore(s => s.details);
  const failedDetails = useAnimeDetailStore(s => s.failed);
  const retryDetail = useAnimeDetailStore(s => s.retry);

  const relevantAnilistIds = useMemo(() => {
    if (entries.length === 0) return [] as number[];
    const libraryById = new Map<number, number>();
    for (const entry of libraryEntries) {
      if (entry.anilistId != null) libraryById.set(entry.id, entry.anilistId);
    }
    const ids = new Set<number>();
    for (const diary of entries) {
      if (diary.animeId == null) continue;
      const anilistId = libraryById.get(diary.animeId);
      if (anilistId) ids.add(anilistId);
    }
    return Array.from(ids);
  }, [entries, libraryEntries]);

  useEffect(() => {
    if (relevantAnilistIds.length > 0) ensureDetails(relevantAnilistIds);
  }, [relevantAnilistIds, ensureDetails]);

  // Per-item AniList failures (e.g. rate-limit) leave gaps in the breakdown
  // rather than blanking it. Surface how many and offer a one-tap retry so a
  // transient failure on this flagship surface is recoverable.
  const failedIds = useMemo(
    () => relevantAnilistIds.filter(id => failedDetails.has(id)),
    [relevantAnilistIds, failedDetails]
  );

  const retryFailedDetails = useCallback(() => {
    for (const id of failedIds) retryDetail(id);
  }, [failedIds, retryDetail]);

  const { genres, studios } = useDiaryBreakdowns(entries, animeDetails);

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col gap-5',
        'border-l border-border-glass bg-foreground/[0.015]',
        'px-5 py-5'
      )}
    >
      <StreakCard
        current={stats.currentStreak}
        longest={stats.longestStreak}
        milestone={milestone}
        achievedMilestone={[...CELEBRATION_MILESTONES]
          .reverse()
          .find(m => stats.currentStreak >= m)}
      />

      <SidebarSection>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label={t('sidebar.stats.totalEntries')} value={stats.total} />
          <StatTile
            label={t('sidebar.stats.thisMonth')}
            value={stats.thisMonth}
            sub={t('sidebar.stats.thisMonthSub', { count: stats.thisMonth })}
          />
          <StatTile
            label={t('sidebar.stats.longestStreak')}
            value={stats.longestStreak}
            sub={t('sidebar.stats.longestStreakSub', { count: stats.longestStreak })}
          />
          <StatTile
            label={t('sidebar.stats.linkedToAnime')}
            value={stats.linkedToAnime}
            sub={t('sidebar.stats.linkedToAnimeSub', { count: stats.linkedToAnime })}
          />
        </div>
      </SidebarSection>

      <ActivityHeatmap
        weeks={stats.activeDaysByWeekOfYear}
        maxCount={stats.maxWeekCount}
        total={stats.total}
      />

      <TopTagsBlock tags={stats.topTags} />

      {failedIds.length > 0 && (
        <button
          type="button"
          onClick={retryFailedDetails}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-[9px] border border-border-glass',
            'bg-foreground/[0.03] px-3 py-2 text-[11px] text-muted-foreground',
            'transition-colors hover:bg-foreground/[0.06] hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
          {t('sidebar.breakdownRetry', { count: failedIds.length })}
        </button>
      )}

      <SidebarSection>
        <SidebarLabel icon={Clapperboard}>{t('sidebar.genres')}</SidebarLabel>
        <GenreBreakdown genres={genres} />
      </SidebarSection>

      <SidebarSection>
        <SidebarLabel icon={Building2}>{t('sidebar.studios')}</SidebarLabel>
        <StudioBreakdown studios={studios} />
      </SidebarSection>
    </aside>
  );
}

function SidebarLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {children}
    </div>
  );
}

function SidebarSection({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

interface StreakCardProps {
  current: number;
  longest: number;
  milestone: { target: number; progress: number };
  /** Highest celebration milestone (7/14/30) the current streak has reached. */
  achievedMilestone?: number;
}

function StreakCard({ current, longest, milestone, achievedMilestone }: StreakCardProps) {
  const { t } = useTranslation('diary');
  const dotsCount = Math.min(current, 23);
  const dots = Array.from({ length: 23 }, (_, i) => i < dotsCount);
  const remaining = Math.max(0, milestone.target - current);
  const note =
    current === 0
      ? t('sidebar.streakNoteEmpty')
      : current >= longest
        ? t('sidebar.streakNoteRecord', { target: milestone.target })
        : t('sidebar.streakNoteProgress', {
            longest,
            longestUnit: t('sidebar.dayUnit', { count: longest }),
            target: milestone.target,
            remaining,
            remainingUnit: t('sidebar.dayUnit', { count: remaining }),
          });

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[12px] border border-[oklch(0.8_0.14_70/0.3)] p-4',
        'bg-[linear-gradient(145deg,oklch(0.74_0.15_355/0.18),oklch(0.8_0.14_70/0.12))]'
      )}
    >
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[oklch(0.8_0.14_70)]">
        <Flame className="w-3.5 h-3.5" aria-hidden="true" />
        {t('sidebar.currentStreak')}
        {achievedMilestone != null && (
          <span
            className={cn(
              'ml-auto rounded-full border border-[oklch(0.8_0.14_70/0.45)] bg-[oklch(0.8_0.14_70/0.15)]',
              'px-2 py-[2px] text-[9px] tracking-[0.12em] text-[oklch(0.8_0.14_70)]'
            )}
          >
            {t('sidebar.celebration.badge', { count: achievedMilestone })}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 font-serif text-[38px] font-extrabold leading-none text-[oklch(0.8_0.14_70)]">
        {current}
        <small className="font-mono text-[11px] font-medium tracking-[0.12em] text-muted-foreground">
          {t('sidebar.dayInRow', { count: current })}
        </small>
      </div>
      <p className="mt-2 text-[11.5px] leading-[1.4] text-foreground/80">{note}</p>
      <div className="mt-3 flex gap-[2px]" aria-hidden="true">
        {dots.map((on, i) => (
          <span
            key={i}
            className={cn(
              'h-[14px] flex-1 rounded-[2px]',
              on
                ? 'bg-[oklch(0.8_0.14_70)] shadow-[0_0_4px_oklch(0.8_0.14_70/0.5)]'
                : 'bg-foreground/10'
            )}
          />
        ))}
      </div>
      <div className="mt-3">
        <ProgressBar value={milestone.progress} thickness={3} glow tone="primary" />
        <div className="mt-1 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground/70">
          <span>{t('sidebar.goalLabel', { target: milestone.target })}</span>
          <span>{Math.round(milestone.progress)}%</span>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div
      className={cn('rounded-[9px] border border-border-glass bg-foreground/[0.03] px-3 py-2.5')}
    >
      <StatCell label={label} value={value} sub={sub} />
    </div>
  );
}

interface ActivityHeatmapProps {
  weeks: number[];
  maxCount: number;
  total: number;
}

function ActivityHeatmap({ weeks, maxCount, total }: ActivityHeatmapProps) {
  const { t } = useTranslation('diary');
  if (total === 0) {
    return (
      <SidebarSection>
        <SidebarLabel icon={CalendarDays}>{t('sidebar.activity.label')}</SidebarLabel>
        <ComingSoonPlaceholder
          icon={Sparkles}
          tag={t('sidebar.activity.emptyTag')}
          title={t('sidebar.activity.emptyTitle')}
          description={t('sidebar.activity.emptyDescription')}
          className="min-h-[160px] p-5"
        />
      </SidebarSection>
    );
  }

  return (
    <SidebarSection>
      <SidebarLabel icon={CalendarDays}>{t('sidebar.activity.label52w')}</SidebarLabel>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}
        aria-hidden="true"
      >
        {/* Aggregate 53 weeks into 13 columns × 7 rows (Fibonacci-ish bucket to match mock) */}
        {weeks.slice(-91).map((count, i) => {
          const level = bucketLevel(count, maxCount);
          return (
            <span
              key={i}
              className="aspect-square rounded-[2px]"
              style={{ background: HEATMAP_LEVELS[level] }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground/70">
        <span>{t('sidebar.activity.less')}</span>
        <div className="flex gap-[2px]">
          {HEATMAP_LEVELS.map((bg, i) => (
            <span key={i} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: bg }} />
          ))}
        </div>
        <span>{t('sidebar.activity.more')}</span>
      </div>
    </SidebarSection>
  );
}

const HEATMAP_LEVELS = [
  'oklch(1 0 0 / 0.05)',
  'oklch(0.74 0.15 355 / 0.25)',
  'oklch(0.74 0.15 355 / 0.5)',
  'oklch(0.74 0.15 355 / 0.8)',
  'oklch(0.74 0.15 355)',
] as const;

function bucketLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

function TopTagsBlock({ tags }: { tags: { tag: string; count: number }[] }) {
  const { t } = useTranslation('diary');
  if (tags.length === 0) {
    return (
      <SidebarSection>
        <SidebarLabel icon={TagIcon}>{t('sidebar.topTags')}</SidebarLabel>
        <p className="text-[11.5px] text-muted-foreground/70">{t('sidebar.topTagsHint')}</p>
      </SidebarSection>
    );
  }
  return (
    <SidebarSection>
      <SidebarLabel icon={TagIcon}>{t('sidebar.topTags')}</SidebarLabel>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <PillTag key={t.tag} variant={i === 0 ? 'accent' : 'muted'}>
            #{t.tag} · {t.count}
          </PillTag>
        ))}
      </div>
    </SidebarSection>
  );
}
