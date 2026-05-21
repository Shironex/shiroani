import type { NotificationSettings, NotificationSubscription, AiringAnime } from '@shiroani/shared';
import {
  isInQuietHours,
  getTitle,
  shouldNotifyForAiring,
  pruneSentSet,
  buildNotificationBody,
  mergeSettings,
  sanitizeSettingsUpdate,
  updateLastSeenTimestamps,
  pruneStaleSubscriptions,
  computeUpcomingNotifications,
  STALE_SUBSCRIPTION_DAYS,
  DEFAULT_SETTINGS,
  CHECK_INTERVAL_MS,
  MISSED_WINDOW_MS,
  PRUNE_THRESHOLD,
  PRUNE_KEEP,
} from '../notification-logic';

function makeSettings(overrides: Partial<NotificationSettings> = {}): NotificationSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides,
    quietHours: {
      ...DEFAULT_SETTINGS.quietHours,
      ...(overrides.quietHours ?? {}),
    },
    subscriptions: overrides.subscriptions ?? [],
  };
}

// ========================================
// isInQuietHours
// ========================================

describe('isInQuietHours', () => {
  it('returns false when quiet hours are disabled', () => {
    const settings = makeSettings({ quietHours: { enabled: false, start: '23:00', end: '07:00' } });
    expect(isInQuietHours(settings, 0)).toBe(false);
    expect(isInQuietHours(settings, 23 * 60 + 30)).toBe(false);
  });

  describe('same-day range (09:00 - 17:00)', () => {
    const settings = makeSettings({ quietHours: { enabled: true, start: '09:00', end: '17:00' } });

    it('returns true during quiet hours', () => {
      expect(isInQuietHours(settings, 9 * 60)).toBe(true); // 09:00 exactly
      expect(isInQuietHours(settings, 12 * 60)).toBe(true); // 12:00
      expect(isInQuietHours(settings, 16 * 60 + 59)).toBe(true); // 16:59
    });

    it('returns false outside quiet hours', () => {
      expect(isInQuietHours(settings, 8 * 60 + 59)).toBe(false); // 08:59
      expect(isInQuietHours(settings, 17 * 60)).toBe(false); // 17:00 (end is exclusive)
      expect(isInQuietHours(settings, 23 * 60)).toBe(false); // 23:00
    });
  });

  describe('overnight wrap (23:00 - 07:00)', () => {
    const settings = makeSettings({ quietHours: { enabled: true, start: '23:00', end: '07:00' } });

    it('returns true during quiet hours (after midnight)', () => {
      expect(isInQuietHours(settings, 0)).toBe(true); // 00:00
      expect(isInQuietHours(settings, 3 * 60)).toBe(true); // 03:00
      expect(isInQuietHours(settings, 6 * 60 + 59)).toBe(true); // 06:59
    });

    it('returns true during quiet hours (before midnight)', () => {
      expect(isInQuietHours(settings, 23 * 60)).toBe(true); // 23:00
      expect(isInQuietHours(settings, 23 * 60 + 30)).toBe(true); // 23:30
    });

    it('returns false outside quiet hours', () => {
      expect(isInQuietHours(settings, 7 * 60)).toBe(false); // 07:00 (end is exclusive)
      expect(isInQuietHours(settings, 12 * 60)).toBe(false); // 12:00
      expect(isInQuietHours(settings, 22 * 60 + 59)).toBe(false); // 22:59
    });
  });

  describe('edge case: same start and end', () => {
    const settings = makeSettings({ quietHours: { enabled: true, start: '12:00', end: '12:00' } });

    it('returns false at the exact time (same-day range with zero width)', () => {
      expect(isInQuietHours(settings, 12 * 60)).toBe(false);
    });
  });
});

// ========================================
// getTitle
// ========================================

describe('getTitle', () => {
  const makeMedia = (title: { english?: string; romaji?: string; native?: string }) => ({
    id: 1,
    title,
    coverImage: {},
    status: 'RELEASING',
    genres: [] as string[],
  });

  it('prefers english title', () => {
    expect(
      getTitle(makeMedia({ english: 'My Hero', romaji: 'Boku no Hero', native: '僕のヒーロー' }))
    ).toBe('My Hero');
  });

  it('falls back to romaji', () => {
    expect(getTitle(makeMedia({ romaji: 'Boku no Hero', native: '僕のヒーロー' }))).toBe(
      'Boku no Hero'
    );
  });

  it('falls back to native', () => {
    expect(getTitle(makeMedia({ native: '僕のヒーロー' }))).toBe('僕のヒーロー');
  });

  it('falls back to default string', () => {
    expect(getTitle(makeMedia({}))).toBe('Nieznane anime');
  });
});

// ========================================
// shouldNotifyForAiring
// ========================================

describe('shouldNotifyForAiring', () => {
  const missedWindowSeconds = MISSED_WINDOW_MS / 1000; // 1800s (30 min)
  const checkWindowSeconds = CHECK_INTERVAL_MS / 1000; // 300s (5 min)

  describe('leadTimeSeconds = 0 (notify at airing time)', () => {
    const leadTime = 0;

    it('notifies for anime airing now', () => {
      expect(shouldNotifyForAiring(0, leadTime)).toBe(true);
    });

    it('notifies for anime airing within check window (positive)', () => {
      expect(shouldNotifyForAiring(checkWindowSeconds, leadTime)).toBe(true);
      expect(shouldNotifyForAiring(60, leadTime)).toBe(true); // 1 min from now
    });

    it('notifies for recently missed anime (within 30 min)', () => {
      expect(shouldNotifyForAiring(-60, leadTime)).toBe(true); // aired 1 min ago
      expect(shouldNotifyForAiring(-missedWindowSeconds, leadTime)).toBe(true); // exactly 30 min ago
    });

    it('does NOT notify for anime aired more than 30 min ago', () => {
      expect(shouldNotifyForAiring(-missedWindowSeconds - 1, leadTime)).toBe(false);
      expect(shouldNotifyForAiring(-3600, leadTime)).toBe(false); // 1 hour ago
    });

    it('does NOT notify for anime airing beyond check window', () => {
      expect(shouldNotifyForAiring(checkWindowSeconds + 1, leadTime)).toBe(false);
      expect(shouldNotifyForAiring(600, leadTime)).toBe(false); // 10 min
    });
  });

  describe('leadTimeSeconds > 0 (notify before airing)', () => {
    const leadTime = 15 * 60; // 15 minutes

    it('notifies when airing is within lead time', () => {
      expect(shouldNotifyForAiring(leadTime, leadTime)).toBe(true); // exactly at lead time
      expect(shouldNotifyForAiring(leadTime - 1, leadTime)).toBe(true);
      expect(shouldNotifyForAiring(60, leadTime)).toBe(true); // 1 min before
    });

    it('notifies for anime airing now', () => {
      expect(shouldNotifyForAiring(0, leadTime)).toBe(true);
    });

    it('notifies for recently missed anime (within 30 min)', () => {
      expect(shouldNotifyForAiring(-60, leadTime)).toBe(true); // aired 1 min ago
      expect(shouldNotifyForAiring(-missedWindowSeconds, leadTime)).toBe(true); // exactly 30 min ago
    });

    it('does NOT notify for anime aired more than 30 min ago', () => {
      expect(shouldNotifyForAiring(-missedWindowSeconds - 1, leadTime)).toBe(false);
    });

    it('does NOT notify for anime too far in the future', () => {
      expect(shouldNotifyForAiring(leadTime + 1, leadTime)).toBe(false);
      expect(shouldNotifyForAiring(3600, leadTime)).toBe(false); // 1 hour
    });
  });

  describe('large lead time (60 min)', () => {
    const leadTime = 60 * 60; // 60 minutes

    it('notifies within entire lead time window', () => {
      expect(shouldNotifyForAiring(3599, leadTime)).toBe(true);
      expect(shouldNotifyForAiring(3600, leadTime)).toBe(true);
    });

    it('does NOT notify beyond lead time', () => {
      expect(shouldNotifyForAiring(3601, leadTime)).toBe(false);
    });
  });
});

// ========================================
// pruneSentSet
// ========================================

describe('pruneSentSet', () => {
  it('returns the same set if under threshold', () => {
    const set = new Set(['1:1', '2:2', '3:3']);
    const result = pruneSentSet(set);
    expect(result).toBe(set); // same reference
    expect(result.size).toBe(3);
  });

  it('returns the same set at exactly threshold', () => {
    const keys = Array.from({ length: PRUNE_THRESHOLD }, (_, i) => `${i}:1`);
    const set = new Set(keys);
    const result = pruneSentSet(set);
    expect(result).toBe(set);
    expect(result.size).toBe(PRUNE_THRESHOLD);
  });

  it('prunes to PRUNE_KEEP when exceeding threshold', () => {
    const keys = Array.from({ length: PRUNE_THRESHOLD + 1 }, (_, i) => `${i}:1`);
    const set = new Set(keys);
    const result = pruneSentSet(set);
    expect(result.size).toBe(PRUNE_KEEP);
    // Should keep the most recent entries (last ones)
    expect(result.has(`${PRUNE_THRESHOLD}:1`)).toBe(true);
    expect(result.has('0:1')).toBe(false);
  });

  it('keeps the most recent entries (preserves insertion order)', () => {
    const keys = Array.from({ length: 600 }, (_, i) => `media${i}:ep1`);
    const set = new Set(keys);
    const result = pruneSentSet(set);
    expect(result.size).toBe(PRUNE_KEEP);
    // Last 400 entries should be kept: media200..media599
    expect(result.has('media200:ep1')).toBe(true);
    expect(result.has('media599:ep1')).toBe(true);
    expect(result.has('media199:ep1')).toBe(false);
  });
});

// ========================================
// buildNotificationBody
// ========================================

describe('buildNotificationBody', () => {
  it('shows "now" for episodes airing within 1 minute', () => {
    expect(buildNotificationBody(5, 0)).toBe('Odcinek 5 nadawany teraz!');
    expect(buildNotificationBody(5, 1)).toBe('Odcinek 5 nadawany teraz!');
    expect(buildNotificationBody(5, -1)).toBe('Odcinek 5 nadawany teraz!');
  });

  it('shows past tense for episodes aired more than 1 minute ago', () => {
    expect(buildNotificationBody(3, -5)).toBe('Odcinek 3 — nadawany 5 min temu');
    expect(buildNotificationBody(3, -30)).toBe('Odcinek 3 — nadawany 30 min temu');
  });

  it('shows future tense for episodes airing in the future', () => {
    expect(buildNotificationBody(7, 15)).toBe('Odcinek 7 za 15 min');
    expect(buildNotificationBody(7, 60)).toBe('Odcinek 7 za 60 min');
    expect(buildNotificationBody(7, 2)).toBe('Odcinek 7 za 2 min');
  });
});

// ========================================
// mergeSettings
// ========================================

describe('mergeSettings', () => {
  it('returns defaults when no stored settings', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('merges partial settings with defaults', () => {
    const result = mergeSettings({ enabled: true, leadTimeMinutes: 30 });
    expect(result.enabled).toBe(true);
    expect(result.leadTimeMinutes).toBe(30);
    expect(result.useSystemSound).toBe(true); // default
    expect(result.quietHours).toEqual(DEFAULT_SETTINGS.quietHours);
    expect(result.subscriptions).toEqual([]);
  });

  it('merges quiet hours partially', () => {
    const result = mergeSettings({
      quietHours: { enabled: true, start: '22:00', end: '06:00' },
    });
    expect(result.quietHours).toEqual({ enabled: true, start: '22:00', end: '06:00' });
  });

  it('preserves subscriptions from stored settings', () => {
    const subs: NotificationSubscription[] = [
      {
        anilistId: 123,
        title: 'Test',
        enabled: true,
        subscribedAt: '2024-01-01T00:00:00.000Z',
        source: 'schedule',
      },
    ];
    const result = mergeSettings({ subscriptions: subs });
    expect(result.subscriptions).toEqual(subs);
  });
});

// ========================================
// sanitizeSettingsUpdate
// ========================================

describe('sanitizeSettingsUpdate', () => {
  const base = makeSettings({ enabled: true, leadTimeMinutes: 15 });

  it('applies valid boolean enabled', () => {
    const result = sanitizeSettingsUpdate(base, { enabled: false });
    expect(result.enabled).toBe(false);
  });

  it('ignores non-boolean enabled', () => {
    const result = sanitizeSettingsUpdate(base, { enabled: 'yes' as unknown as boolean });
    expect(result.enabled).toBe(true); // unchanged
  });

  it('applies valid leadTimeMinutes', () => {
    const result = sanitizeSettingsUpdate(base, { leadTimeMinutes: 30 });
    expect(result.leadTimeMinutes).toBe(30);
  });

  it('rejects negative leadTimeMinutes', () => {
    const result = sanitizeSettingsUpdate(base, { leadTimeMinutes: -5 });
    expect(result.leadTimeMinutes).toBe(15); // unchanged
  });

  it('rejects leadTimeMinutes > 1440', () => {
    const result = sanitizeSettingsUpdate(base, { leadTimeMinutes: 1441 });
    expect(result.leadTimeMinutes).toBe(15); // unchanged
  });

  it('rejects NaN leadTimeMinutes', () => {
    const result = sanitizeSettingsUpdate(base, { leadTimeMinutes: NaN });
    expect(result.leadTimeMinutes).toBe(15); // unchanged
  });

  it('rejects Infinity leadTimeMinutes', () => {
    const result = sanitizeSettingsUpdate(base, { leadTimeMinutes: Infinity });
    expect(result.leadTimeMinutes).toBe(15); // unchanged
  });

  it('accepts leadTimeMinutes = 0', () => {
    const result = sanitizeSettingsUpdate(base, { leadTimeMinutes: 0 });
    expect(result.leadTimeMinutes).toBe(0);
  });

  it('accepts leadTimeMinutes = 1440', () => {
    const result = sanitizeSettingsUpdate(base, { leadTimeMinutes: 1440 });
    expect(result.leadTimeMinutes).toBe(1440);
  });

  it('applies valid quiet hours', () => {
    const result = sanitizeSettingsUpdate(base, {
      quietHours: { enabled: true, start: '22:00', end: '06:00' },
    });
    expect(result.quietHours).toEqual({ enabled: true, start: '22:00', end: '06:00' });
  });

  it('rejects invalid quiet hours time format', () => {
    const result = sanitizeSettingsUpdate(base, {
      quietHours: { enabled: true, start: 'invalid', end: '6pm' },
    });
    expect(result.quietHours.enabled).toBe(true); // boolean is valid
    expect(result.quietHours.start).toBe('23:00'); // unchanged from base default
    expect(result.quietHours.end).toBe('07:00'); // unchanged from base default
  });

  it('applies valid useSystemSound', () => {
    const result = sanitizeSettingsUpdate(base, { useSystemSound: false });
    expect(result.useSystemSound).toBe(false);
  });

  it('ignores non-boolean useSystemSound', () => {
    const result = sanitizeSettingsUpdate(base, { useSystemSound: 1 as unknown as boolean });
    expect(result.useSystemSound).toBe(true); // unchanged
  });

  it('preserves fields not in the update', () => {
    const result = sanitizeSettingsUpdate(base, { enabled: false });
    expect(result.leadTimeMinutes).toBe(15);
    expect(result.useSystemSound).toBe(true);
    expect(result.quietHours).toEqual(base.quietHours);
  });

  it('handles empty updates', () => {
    const result = sanitizeSettingsUpdate(base, {});
    expect(result).toEqual(base);
  });
});

// ========================================
// updateLastSeenTimestamps
// ========================================

function makeSub(overrides: Partial<NotificationSubscription> = {}): NotificationSubscription {
  return {
    anilistId: 1,
    title: 'Test Anime',
    subscribedAt: '2025-01-01T00:00:00.000Z',
    enabled: true,
    source: 'schedule',
    ...overrides,
  };
}

describe('updateLastSeenTimestamps', () => {
  it('stamps lastSeenAt for subscriptions in schedule', () => {
    const subs = [makeSub({ anilistId: 100 }), makeSub({ anilistId: 200 })];
    const scheduleIds = new Set([100]);
    const result = updateLastSeenTimestamps(subs, scheduleIds);
    expect(result).not.toBe(subs); // new reference
    expect(result[0].lastSeenAt).toBeDefined();
    expect(result[1].lastSeenAt).toBeUndefined();
  });

  it('returns same reference if nothing changed', () => {
    const subs = [makeSub({ anilistId: 100 })];
    const scheduleIds = new Set([999]); // no match
    const result = updateLastSeenTimestamps(subs, scheduleIds);
    expect(result).toBe(subs);
  });

  it('handles empty subscriptions', () => {
    const result = updateLastSeenTimestamps([], new Set([100]));
    expect(result).toEqual([]);
  });

  it('handles empty schedule', () => {
    const subs = [makeSub({ anilistId: 100 })];
    const result = updateLastSeenTimestamps(subs, new Set());
    expect(result).toBe(subs);
  });
});

// ========================================
// pruneStaleSubscriptions
// ========================================

describe('pruneStaleSubscriptions', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  it('keeps subscriptions without lastSeenAt (legacy grace)', () => {
    const subs = [makeSub({ anilistId: 1 })]; // no lastSeenAt
    const { kept, pruned } = pruneStaleSubscriptions(subs);
    expect(kept).toHaveLength(1);
    expect(pruned).toHaveLength(0);
  });

  it('keeps subscriptions with recent lastSeenAt', () => {
    const subs = [makeSub({ anilistId: 1, lastSeenAt: daysAgo(3) })];
    const { kept, pruned } = pruneStaleSubscriptions(subs);
    expect(kept).toHaveLength(1);
    expect(pruned).toHaveLength(0);
  });

  it('prunes subscriptions older than 14 days', () => {
    const subs = [makeSub({ anilistId: 1, lastSeenAt: daysAgo(15), title: 'Old Anime' })];
    const { kept, pruned } = pruneStaleSubscriptions(subs);
    expect(kept).toHaveLength(0);
    expect(pruned).toHaveLength(1);
    expect(pruned[0].title).toBe('Old Anime');
  });

  it('keeps subscriptions at exactly 14 days', () => {
    const subs = [makeSub({ anilistId: 1, lastSeenAt: daysAgo(STALE_SUBSCRIPTION_DAYS) })];
    const { kept, pruned } = pruneStaleSubscriptions(subs);
    expect(kept).toHaveLength(1);
    expect(pruned).toHaveLength(0);
  });

  it('handles mixed fresh, stale, and legacy subscriptions', () => {
    const subs = [
      makeSub({ anilistId: 1, lastSeenAt: daysAgo(1) }), // fresh
      makeSub({ anilistId: 2, lastSeenAt: daysAgo(20) }), // stale
      makeSub({ anilistId: 3 }), // legacy
    ];
    const { kept, pruned } = pruneStaleSubscriptions(subs);
    expect(kept).toHaveLength(2);
    expect(pruned).toHaveLength(1);
    expect(pruned[0].anilistId).toBe(2);
  });

  it('handles empty subscriptions', () => {
    const { kept, pruned } = pruneStaleSubscriptions([]);
    expect(kept).toHaveLength(0);
    expect(pruned).toHaveLength(0);
  });

  it('supports custom maxAgeDays', () => {
    const subs = [makeSub({ anilistId: 1, lastSeenAt: daysAgo(5) })];
    const { kept, pruned } = pruneStaleSubscriptions(subs, 3);
    expect(kept).toHaveLength(0);
    expect(pruned).toHaveLength(1);
  });
});

// ========================================
// computeUpcomingNotifications
// ========================================

function makeAiring(overrides: Partial<AiringAnime> & { mediaId?: number } = {}): AiringAnime {
  const { mediaId = 1, ...rest } = overrides;
  return {
    id: 1,
    airingAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    episode: 1,
    media: {
      id: mediaId,
      title: { romaji: 'Test Anime' },
      coverImage: {},
      status: 'RELEASING',
      genres: [],
    },
    ...rest,
  };
}

describe('computeUpcomingNotifications', () => {
  const baseSettings = makeSettings({ enabled: true, leadTimeMinutes: 15 });
  const notifyIds = new Set([1, 2]);
  const emptySent = new Set<string>();

  it('returns upcoming notifications for monitored anime', () => {
    const schedule = [makeAiring({ mediaId: 1 })];
    const result = computeUpcomingNotifications(schedule, baseSettings, notifyIds, emptySent);
    expect(result).toHaveLength(1);
    expect(result[0].airing.media.id).toBe(1);
    expect(result[0].deliveryTime).toBeInstanceOf(Date);
  });

  it('excludes anime not in notifyIds', () => {
    const schedule = [makeAiring({ mediaId: 999 })];
    const result = computeUpcomingNotifications(schedule, baseSettings, notifyIds, emptySent);
    expect(result).toHaveLength(0);
  });

  it('excludes already-sent notifications', () => {
    const schedule = [makeAiring({ mediaId: 1, episode: 5 })];
    const sent = new Set(['1:5']);
    const result = computeUpcomingNotifications(schedule, baseSettings, notifyIds, sent);
    expect(result).toHaveLength(0);
  });

  it('excludes airings in the past', () => {
    const pastAiring = makeAiring({
      mediaId: 1,
      airingAt: Math.floor(Date.now() / 1000) - 3600,
    });
    const result = computeUpcomingNotifications([pastAiring], baseSettings, notifyIds, emptySent);
    expect(result).toHaveLength(0);
  });

  it('excludes airings beyond 48 hours', () => {
    const farFuture = makeAiring({
      mediaId: 1,
      airingAt: Math.floor(Date.now() / 1000) + 49 * 3600,
    });
    const result = computeUpcomingNotifications([farFuture], baseSettings, notifyIds, emptySent);
    expect(result).toHaveLength(0);
  });

  it('excludes notifications whose delivery time is in the past', () => {
    // Airing is 5 minutes from now, lead time is 15 minutes
    // Delivery would be 10 minutes ago — should be excluded
    const soonAiring = makeAiring({
      mediaId: 1,
      airingAt: Math.floor(Date.now() / 1000) + 5 * 60,
    });
    const settings = makeSettings({ enabled: true, leadTimeMinutes: 15 });
    const result = computeUpcomingNotifications([soonAiring], settings, notifyIds, emptySent);
    expect(result).toHaveLength(0);
  });

  it('handles empty schedule', () => {
    const result = computeUpcomingNotifications([], baseSettings, notifyIds, emptySent);
    expect(result).toHaveLength(0);
  });

  it('handles leadTimeMinutes = 0 (delivery at airing time)', () => {
    const schedule = [makeAiring({ mediaId: 1 })];
    const settings = makeSettings({ enabled: true, leadTimeMinutes: 0 });
    const result = computeUpcomingNotifications(schedule, settings, notifyIds, emptySent);
    expect(result).toHaveLength(1);
    // Delivery time should be the same as airing time
    expect(result[0].deliveryTime.getTime()).toBe(schedule[0].airingAt * 1000);
  });
});
