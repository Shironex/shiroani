/**
 * Anime-flavored conversions for the local time-spent counters.
 *
 * Picks a yardstick (Frieren and friends) deterministically from the day-of-year
 * so the copy stays fresh without RNG flicker between renders.
 *
 * Copy lives in `profile.json#appPanel.hero.*`; this module only assembles
 * pieces. i18next handles the plural buckets per CLDR rules so the helpers
 * read correctly in both PL (one/few/many/other) and EN (one/other).
 */

import type { AppStatsSnapshot } from '@shiroani/shared';
import i18n from '@/lib/i18n';

export interface Yardstick {
  id: string;
  /** Title used verbatim — uppercase / mixed-case as published. */
  title: string;
  episodes: number;
  perEpisodeMin: number;
}

/**
 * Frieren leads the rotation — most resonant in the 2024–2026 anime canon and
 * a deliberate tonal contrast to the Spy×Family-noir landing aesthetic.
 */
export const YARDSTICKS: readonly Yardstick[] = [
  { id: 'frieren', title: 'Frieren', episodes: 28, perEpisodeMin: 24 },
  { id: 'spyfamily', title: 'SPY×FAMILY', episodes: 25, perEpisodeMin: 24 },
  { id: 'cowboybop', title: 'Cowboy Bebop', episodes: 26, perEpisodeMin: 24 },
  { id: 'monogatari', title: 'Bakemonogatari', episodes: 15, perEpisodeMin: 24 },
  { id: 'evangelion', title: 'Neon Genesis Evangelion', episodes: 26, perEpisodeMin: 24 },
] as const;

export const FRIEREN: Yardstick = YARDSTICKS[0];

function dayOfYear(date: Date = new Date()): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((now - start) / 86_400_000);
}

/** Yardstick for "today" — Frieren-led, rotates by day-of-year. */
export function pickYardstick(date: Date = new Date()): Yardstick {
  return YARDSTICKS[dayOfYear(date) % YARDSTICKS.length];
}

function totalSeconds(yardstick: Yardstick): number {
  return yardstick.episodes * yardstick.perEpisodeMin * 60;
}

/**
 * Yardstick comparison sentence — switches to whole-series multiples once
 * the count blows past 1.2× the full series so the conversion stops feeling
 * like arithmetic soup.
 */
export function formatYardstick(seconds: number, yardstick: Yardstick = FRIEREN): string {
  if (seconds <= 0) {
    return i18n.t('profile:appPanel.hero.yardstick.empty', { title: yardstick.title });
  }

  const seriesSeconds = totalSeconds(yardstick);
  if (seconds >= seriesSeconds * 1.2) {
    const times = Math.floor(seconds / seriesSeconds);
    return i18n.t('profile:appPanel.hero.yardstick.fullSeries', {
      count: times,
      title: yardstick.title,
    });
  }

  const episodes = Math.max(1, Math.floor(seconds / (yardstick.perEpisodeMin * 60)));
  return i18n.t('profile:appPanel.hero.yardstick.episodes', {
    count: episodes,
    title: yardstick.title,
  });
}

/**
 * Locale-aware duration string for the hero line — falls through seconds /
 * minutes / hours / days+hours buckets, with i18next handling the plural
 * forms per locale. Renamed from `formatPolishDuration` after the copy
 * moved out of TS.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return i18n.t('profile:appPanel.hero.duration.seconds', {
      count: Math.max(0, Math.floor(seconds)),
    });
  }
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) {
    return i18n.t('profile:appPanel.hero.duration.minutes', { count: totalMinutes });
  }
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) {
    const hourPart = i18n.t('profile:appPanel.hero.duration.hours', { count: totalHours });
    if (minutes === 0) return hourPart;
    const minutePart = i18n.t('profile:appPanel.hero.duration.minutes', { count: minutes });
    return i18n.t('profile:appPanel.hero.duration.hoursAndMinutes', {
      hours: hourPart,
      minutes: minutePart,
    });
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const dayPart = i18n.t('profile:appPanel.hero.duration.daysOnly', { count: days });
  if (hours === 0) return dayPart;
  const hourPart = i18n.t('profile:appPanel.hero.duration.hours', { count: hours });
  return i18n.t('profile:appPanel.hero.duration.daysAndHours', {
    days: dayPart,
    hours: hourPart,
  });
}

/** Days elapsed since the first session ever (returns 1 even on day-1). */
export function daysSinceCreated(snapshot: AppStatsSnapshot, now: Date = new Date()): number {
  if (!snapshot.createdAt) return 1;
  const createdMs = Date.parse(snapshot.createdAt);
  if (!Number.isFinite(createdMs)) return 1;
  const days = Math.floor((now.getTime() - createdMs) / 86_400_000);
  return Math.max(1, days + 1);
}

export interface HeroLine {
  /** Top hero stat — duration + yardstick comparison. */
  primary: string;
  /** Sub-line — active vs anime breakdown. */
  secondary: string;
}

export function buildHeroLine(snapshot: AppStatsSnapshot): HeroLine {
  const yardstick = pickYardstick();
  const open = snapshot.totals.appOpenSeconds;
  const active = snapshot.totals.appActiveSeconds;
  const watch = snapshot.totals.animeWatchSeconds;

  if (open === 0) {
    return {
      primary: i18n.t('profile:appPanel.hero.primaryEmpty'),
      secondary: i18n.t('profile:appPanel.hero.secondaryEmpty'),
    };
  }

  return {
    primary: i18n.t('profile:appPanel.hero.primary', {
      duration: formatDuration(open),
      yardstick: formatYardstick(open, yardstick),
    }),
    secondary: i18n.t('profile:appPanel.hero.secondary', {
      active: formatDuration(active),
      watch: formatDuration(watch),
    }),
  };
}

// FUTURE: yearly recap reads byDay (defer until v2; daily buckets already
// preserve the year of data we need).
