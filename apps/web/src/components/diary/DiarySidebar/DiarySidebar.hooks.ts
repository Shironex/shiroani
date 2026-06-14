import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { createLocalStorageAccessor } from '@/lib/persisted-storage';
import { useDiaryBreakdowns } from '@/hooks/useDiaryBreakdowns';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import type { DiaryEntry } from '@shiroani/shared';
import type { IDiarySidebarView, IDiaryStats, IStreakMilestone } from './DiarySidebar.types';

// Bucket by local calendar day so streaks don't flip a day early/late for
// users in non-UTC timezones. Always use local-time components — never
// toISOString, which returns UTC.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function computeStats(entries: DiaryEntry[]): IDiaryStats {
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
function nextStreakMilestone(streak: number): IStreakMilestone {
  const target =
    STREAK_MILESTONES.find(m => m > streak) ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1]!;
  const prev = STREAK_MILESTONES.filter(m => m <= streak).pop() ?? 0;
  const span = target - prev;
  const progress = span > 0 ? ((streak - prev) / span) * 100 : 100;
  return { target, progress: Math.max(0, Math.min(100, progress)) };
}

export function useDiarySidebar(entries: DiaryEntry[]): IDiarySidebarView {
  const { t } = useTranslation('diary');
  const stats = useMemo(() => computeStats(entries), [entries]);
  const milestone = nextStreakMilestone(stats.currentStreak);
  const achievedMilestone = [...CELEBRATION_MILESTONES]
    .reverse()
    .find(m => stats.currentStreak >= m);

  // Fire a one-time celebration when the streak reaches 7 / 14 / 30 days. The
  // persisted set guarantees once-per-milestone across sessions, so any
  // milestone already recorded never re-fires — no extra mount guard needed.
  const celebratedRef = useRef<Set<number>>(new Set(celebratedMilestonesStorage.get()));
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

  return {
    t,
    stats,
    milestone,
    achievedMilestone,
    failedCount: failedIds.length,
    retryFailedDetails,
    genres,
    studios,
  };
}
