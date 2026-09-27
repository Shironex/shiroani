/**
 * What the fixture backend answers to each socket request. Event names come
 * from the shared constants, so a rename there cannot silently break the
 * showcase. Anything not listed here is logged by the fake socket and never
 * answered.
 */
import {
  AnimeEvents,
  DiaryEvents,
  FeedEvents,
  LibraryEvents,
  MalEvents,
  ScheduleEvents,
  type FeedGetItemsPayload,
} from '@shiroani/shared';
import { diaryEntries } from './diary';
import { discoverPage } from './discover';
import { feedPage, feedSources } from './feed';
import { libraryEntries } from './library';
import { viewerActivity, viewerProfile } from './profile';
import { dailySchedule, weeklySchedule } from './schedule';
import { isoAt } from './context';

export interface IFixtureReply {
  ack: unknown;
  /** Server-to-client events the real gateway sends alongside the ack. */
  broadcasts?: Array<[event: string, data: unknown]>;
}

type Responder = (payload: unknown) => IFixtureReply;

function field<T>(payload: unknown, key: string, fallback: T): T {
  if (payload && typeof payload === 'object' && key in payload) {
    return (payload as Record<string, T>)[key];
  }
  return fallback;
}

const RESPONDERS: Record<string, Responder> = {
  [LibraryEvents.GET_ALL]: () => ({ ack: { entries: libraryEntries() } }),
  [DiaryEvents.GET_ALL]: () => ({ ack: { entries: diaryEntries() } }),

  [ScheduleEvents.GET_DAILY]: payload => {
    const result = dailySchedule(field(payload, 'date', ''));
    return { ack: result, broadcasts: [[ScheduleEvents.DAILY_RESULT, result]] };
  },
  [ScheduleEvents.GET_WEEKLY]: payload => {
    const result = weeklySchedule(field(payload, 'startDate', ''));
    return { ack: result, broadcasts: [[ScheduleEvents.WEEKLY_RESULT, result]] };
  },

  [FeedEvents.GET_SOURCES]: () => ({ ack: { sources: feedSources() } }),
  [FeedEvents.GET_ITEMS]: payload => ({ ack: feedPage(payload as FeedGetItemsPayload) }),
  [FeedEvents.GET_READ_IDS]: () => ({ ack: { ids: [4, 6, 8] } }),
  [FeedEvents.GET_LAST_VISITED]: () => ({
    ack: { lastVisitedAt: new Date(isoAt(-1, 21, 0)).getTime() },
  }),
  [FeedEvents.SET_LAST_VISITED]: () => ({ ack: { ok: true } }),
  [FeedEvents.MARK_READ]: () => ({ ack: { ok: true } }),

  [AnimeEvents.GET_TRENDING]: () => ({ ack: discoverPage('trending') }),
  [AnimeEvents.GET_POPULAR]: () => ({ ack: discoverPage('popular') }),
  [AnimeEvents.GET_SEASONAL]: () => ({ ack: discoverPage('seasonal') }),
  [AnimeEvents.GET_RANDOM]: () => ({ ack: discoverPage('random') }),

  [AnimeEvents.GET_VIEWER_PROFILE]: () => ({ ack: { profile: viewerProfile() } }),
  [AnimeEvents.GET_VIEWER_ACTIVITY]: () => ({ ack: viewerActivity() }),
  [AnimeEvents.GET_NOTIFICATIONS]: () => ({ ack: { notifications: [], unreadCount: 0 } }),
  [MalEvents.GET_VIEWER_PROFILE]: () => ({ ack: { profile: null } }),

  // The Social view shows other people's activity, so it stays empty here.
  [AnimeEvents.GET_SOCIAL_FEED]: () => ({ ack: { activities: [] } }),
  [AnimeEvents.GET_FOLLOWING]: () => ({ ack: { users: [] } }),
  [AnimeEvents.GET_FOLLOWERS]: () => ({ ack: { users: [] } }),
};

export function respond(event: string, payload: unknown): IFixtureReply | undefined {
  return RESPONDERS[event]?.(payload);
}
