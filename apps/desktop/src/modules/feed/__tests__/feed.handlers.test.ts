import { FeedEvents } from '@shiroani/shared';
import { InflightTracker } from '../../kernel/inflight-tracker';
import { createFeedHandlers } from '../feed.handlers';

const SOURCES = [{ id: 1, name: 'a', enabled: true }];
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function build() {
  const feed = {
    getItems: jest.fn(() => ({ items: [], total: 0, hasMore: false })),
    getAllSources: jest.fn(() => SOURCES),
    toggleSource: jest.fn(),
    getArticleContent: jest.fn(async () => ({ contentHtml: '<p>x</p>' })),
    markRead: jest.fn(),
    getReadIds: jest.fn(() => [1]),
    setLastVisited: jest.fn(),
    getLastVisited: jest.fn(() => 5),
    refreshAllFeeds: jest.fn(async () => 3),
  };
  const emit = jest.fn();
  const inflight = new InflightTracker();
  return { feed, emit, inflight, handlers: createFeedHandlers(feed as never, { emit }, inflight) };
}

describe('feed handlers', () => {
  it('answers the plain reads', async () => {
    const { handlers, emit } = build();

    await expect(handlers[FeedEvents.GET_ITEMS]({ limit: 10 })).resolves.toEqual({
      items: [],
      total: 0,
      hasMore: false,
    });
    await expect(handlers[FeedEvents.GET_SOURCES](undefined)).resolves.toEqual({
      sources: SOURCES,
    });
    await expect(handlers[FeedEvents.GET_READ_IDS](undefined)).resolves.toEqual({ ids: [1] });
    await expect(handlers[FeedEvents.GET_LAST_VISITED](undefined)).resolves.toEqual({
      lastVisitedAt: 5,
    });
    expect(emit).not.toHaveBeenCalled();
  });

  it('toggles a source and broadcasts the new list', async () => {
    const { handlers, feed, emit } = build();

    await expect(handlers[FeedEvents.TOGGLE_SOURCE]({ id: 1, enabled: false })).resolves.toEqual({
      sources: SOURCES,
    });

    expect(feed.toggleSource).toHaveBeenCalledWith(1, false);
    expect(emit).toHaveBeenCalledWith(FeedEvents.SOURCES_RESULT, { sources: SOURCES });
  });

  it('persists read state and last visited', async () => {
    const { handlers, feed } = build();

    await expect(handlers[FeedEvents.MARK_READ]({ ids: [1, 2] })).resolves.toEqual({ ok: true });
    await expect(handlers[FeedEvents.SET_LAST_VISITED]({ lastVisitedAt: 9 })).resolves.toEqual({
      ok: true,
    });

    expect(feed.markRead).toHaveBeenCalledWith([1, 2]);
    expect(feed.setLastVisited).toHaveBeenCalledWith(9);
  });

  it('never reaches the service with an invalid payload', async () => {
    const { handlers, feed } = build();

    const result = await handlers[FeedEvents.GET_ARTICLE]({ url: 'not a url' });

    expect(result.contentHtml).toBeNull();
    expect(typeof result.error).toBe('string');
    expect(feed.getArticleContent).not.toHaveBeenCalled();
  });

  describe('refresh', () => {
    it('answers before the sources finish, then broadcasts the count', async () => {
      const { handlers, feed, emit } = build();
      let finish: (count: number) => void = () => {};
      feed.refreshAllFeeds.mockReturnValue(new Promise(resolve => (finish = resolve)));

      await expect(handlers[FeedEvents.REFRESH](undefined)).resolves.toEqual({ started: true });
      expect(emit).not.toHaveBeenCalled();

      finish(3);
      await flush();

      expect(emit).toHaveBeenCalledWith(FeedEvents.NEW_ITEMS, { newItemsCount: 3 });
    });

    it('broadcasts zero on failure, so the spinner still clears', async () => {
      const { handlers, feed, emit } = build();
      feed.refreshAllFeeds.mockRejectedValue(new Error('offline'));

      await handlers[FeedEvents.REFRESH](undefined);
      await flush();

      expect(emit).toHaveBeenCalledWith(FeedEvents.NEW_ITEMS, { newItemsCount: 0 });
    });

    it('stays visible to the shutdown drain while running', async () => {
      const { handlers, feed, inflight } = build();
      let finish: (count: number) => void = () => {};
      feed.refreshAllFeeds.mockReturnValue(new Promise(resolve => (finish = resolve)));

      await handlers[FeedEvents.REFRESH](undefined);
      expect(inflight.size).toBe(1);

      finish(0);
      await flush();
      expect(inflight.size).toBe(0);
    });
  });

  it('returns a response that survives structured clone like it survived JSON', async () => {
    const { handlers, feed } = build();
    feed.getItems.mockReturnValue({
      items: [{ id: 1, title: 'a', author: undefined, imageUrl: undefined }],
      total: 1,
      hasMore: false,
    } as never);

    const result = await handlers[FeedEvents.GET_ITEMS]({});

    expect(structuredClone(result)).toEqual(JSON.parse(JSON.stringify(result)));
  });
});
