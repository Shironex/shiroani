import { MalClient } from '../mal-client';

const mkResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined || body === null ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const tokenPortReturning = (token: string | null) => ({
  getAccessToken: jest.fn().mockResolvedValue(token),
});

describe('MalClient', () => {
  let fetchMock: jest.SpyInstance;
  const origClientId = process.env.MAL_CLIENT_ID;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchMock = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    process.env.MAL_CLIENT_ID = origClientId;
  });

  const optsOf = (callIndex = 0): RequestInit => fetchMock.mock.calls[callIndex][1] as RequestInit;
  const urlOf = (callIndex = 0): string => fetchMock.mock.calls[callIndex][0] as string;
  const headerOf = (name: string, callIndex = 0): string | undefined =>
    (optsOf(callIndex).headers as Record<string, string>)[name];

  // ============================================
  // Header selection
  // ============================================

  describe('header selection', () => {
    it('searchAnime (public read) sends X-MAL-CLIENT-ID, never a Bearer token', async () => {
      process.env.MAL_CLIENT_ID = 'pub-client-99';
      const client = new MalClient(tokenPortReturning('should-not-be-used'));
      fetchMock.mockResolvedValueOnce(mkResponse(200, { data: [] }));

      await client.searchAnime('frieren');

      expect(headerOf('X-MAL-CLIENT-ID')).toBe('pub-client-99');
      expect(headerOf('Authorization')).toBeUndefined();
      expect(urlOf()).toContain('/anime?');
      expect(urlOf()).toContain('q=frieren');
      expect(urlOf()).toContain('fields=id%2Ctitle%2Cmain_picture');
    });

    it('searchAnime throws a clear "not configured" error when MAL_CLIENT_ID is empty', async () => {
      process.env.MAL_CLIENT_ID = '';
      const client = new MalClient();
      await expect(client.searchAnime('q')).rejects.toThrow(/not configured/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('getViewer (user-context read) sends Authorization: Bearer, never X-MAL-CLIENT-ID', async () => {
      const client = new MalClient(tokenPortReturning('tok-abc'));
      fetchMock.mockResolvedValueOnce(mkResponse(200, { id: 1, name: 'Anya' }));

      await client.getViewer();

      expect(headerOf('Authorization')).toBe('Bearer tok-abc');
      expect(headerOf('X-MAL-CLIENT-ID')).toBeUndefined();
    });
  });

  // ============================================
  // getViewer
  // ============================================

  describe('getViewer', () => {
    it('returns null when no token is available (not connected)', async () => {
      const client = new MalClient(tokenPortReturning(null));
      await expect(client.getViewer()).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('selects picture + anime_statistics fields and maps picture -> avatar', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          id: 7,
          name: 'Loid',
          picture: 'https://cdn.myanimelist.net/u/7.jpg',
          anime_statistics: { num_items: 120, num_episodes: 3400 },
        })
      );

      const viewer = await client.getViewer();
      expect(viewer).toEqual({
        id: 7,
        name: 'Loid',
        avatar: 'https://cdn.myanimelist.net/u/7.jpg',
        animeStatistics: { num_items: 120, num_episodes: 3400 },
      });
      expect(urlOf()).toContain('fields=anime_statistics,picture');
    });

    it('leaves avatar undefined when picture is absent', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(mkResponse(200, { id: 1, name: 'x' }));
      const viewer = await client.getViewer();
      expect(viewer?.avatar).toBeUndefined();
    });
  });

  // ============================================
  // getAnimeList — paging + mapping
  // ============================================

  describe('getAnimeList', () => {
    it('returns [] when not connected', async () => {
      const client = new MalClient(tokenPortReturning(null));
      await expect(client.getAnimeList()).resolves.toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('accumulates entries across paging.next, carrying the Bearer header on each page', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock
        .mockResolvedValueOnce(
          mkResponse(200, {
            data: [
              {
                node: { id: 100 },
                list_status: {
                  status: 'watching',
                  score: 8,
                  num_episodes_watched: 5,
                  updated_at: '2024-01-01T00:00:00+00:00',
                },
              },
            ],
            paging: { next: 'https://api.myanimelist.net/v2/users/@me/animelist?offset=1000' },
          })
        )
        .mockResolvedValueOnce(
          mkResponse(200, {
            data: [
              {
                node: { id: 200 },
                list_status: {
                  status: 'completed',
                  score: 10,
                  num_episodes_watched: 12,
                  updated_at: '2024-02-02T00:00:00+00:00',
                },
              },
            ],
            paging: {},
          })
        );

      const entries = await client.getAnimeList();
      expect(entries.map(e => e.mediaId)).toEqual([100, 200]);
      // Second page is fetched from the absolute paging.next URL verbatim.
      expect(urlOf(1)).toBe('https://api.myanimelist.net/v2/users/@me/animelist?offset=1000');
      // Bearer carried on every page.
      expect(headerOf('Authorization', 0)).toBe('Bearer tok');
      expect(headerOf('Authorization', 1)).toBe('Bearer tok');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('maps num_episodes_watched (response field) -> progress and converts ISO updated_at to epoch seconds', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          data: [
            {
              node: { id: 555, title: 'Spy x Family', num_episodes: 24 },
              list_status: {
                status: 'on_hold',
                score: 7,
                num_episodes_watched: 9,
                updated_at: '2024-03-03T12:00:00+00:00',
              },
            },
          ],
          paging: {},
        })
      );

      const [entry] = await client.getAnimeList();
      expect(entry).toEqual({
        mediaId: 555,
        title: 'Spy x Family', // carried from node.title for the sync progress label
        status: 'on_hold',
        score: 7,
        progress: 9, // from num_episodes_watched, NOT node.num_episodes (24)
        updatedAt: Math.floor(Date.parse('2024-03-03T12:00:00+00:00') / 1000),
      });
    });

    it('requests main_picture and maps it to coverImage (medium, falling back to large)', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          data: [
            {
              node: { id: 1, title: 'A', main_picture: { medium: 'a-med.jpg', large: 'a-lg.jpg' } },
              list_status: { status: 'watching', num_episodes_watched: 1 },
            },
            {
              node: { id: 2, title: 'B', main_picture: { large: 'b-lg.jpg' } },
              list_status: { status: 'watching', num_episodes_watched: 1 },
            },
            {
              node: { id: 3, title: 'C' }, // no picture at all
              list_status: { status: 'watching', num_episodes_watched: 1 },
            },
          ],
          paging: {},
        })
      );

      const entries = await client.getAnimeList();
      expect(entries.map(e => e.coverImage)).toEqual(['a-med.jpg', 'b-lg.jpg', undefined]);
      // The list read must select main_picture or imports land with no cover.
      expect(urlOf()).toContain('main_picture');
    });

    it('maps MAL status strings 1:1 to local AnimeStatus and folds is_rewatching to watching', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          data: [
            { node: { id: 1 }, list_status: { status: 'plan_to_watch', num_episodes_watched: 0 } },
            { node: { id: 2 }, list_status: { status: 'dropped', num_episodes_watched: 3 } },
            {
              node: { id: 3 },
              // is_rewatching folds to 'watching' even though status is 'completed'
              list_status: {
                status: 'completed',
                is_rewatching: true,
                num_episodes_watched: 2,
              },
            },
          ],
          paging: {},
        })
      );

      const entries = await client.getAnimeList();
      expect(entries.map(e => e.status)).toEqual(['plan_to_watch', 'dropped', 'watching']);
    });

    it('defaults missing score to 0 (unrated) and absent updated_at to null', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          data: [{ node: { id: 9 }, list_status: { status: 'watching', num_episodes_watched: 1 } }],
          paging: {},
        })
      );
      const [entry] = await client.getAnimeList();
      expect(entry.score).toBe(0);
      expect(entry.updatedAt).toBeNull();
    });

    it('skips items missing a node or list_status without throwing', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          data: [
            { node: null, list_status: { status: 'watching', num_episodes_watched: 1 } },
            { node: { id: 5 }, list_status: null },
            { node: { id: 6 }, list_status: { status: 'completed', num_episodes_watched: 12 } },
          ],
          paging: {},
        })
      );
      const entries = await client.getAnimeList();
      expect(entries.map(e => e.mediaId)).toEqual([6]);
    });

    it('passes a custom userName into the path', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(mkResponse(200, { data: [], paging: {} }));
      await client.getAnimeList('SomeUser');
      expect(urlOf()).toContain('/users/SomeUser/animelist');
    });
  });

  // ============================================
  // getAnimeListEntry — single-entry read (pull/auto)
  // ============================================

  describe('getAnimeListEntry', () => {
    it('returns null when not connected (no token), without a request', async () => {
      const client = new MalClient(tokenPortReturning(null));
      await expect(client.getAnimeListEntry(123)).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('requests GET /anime/{id}?fields=my_list_status,title with a Bearer token', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          id: 42,
          title: 'Frieren',
          my_list_status: { status: 'watching', score: 9, num_episodes_watched: 4 },
        })
      );

      await client.getAnimeListEntry(42);

      expect(urlOf()).toContain('/anime/42?');
      expect(urlOf()).toContain('fields=my_list_status%2Ctitle');
      expect(headerOf('Authorization')).toBe('Bearer tok');
    });

    it('maps the node + my_list_status to a canonical-local entry', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          id: 42,
          title: 'Frieren',
          my_list_status: {
            status: 'completed',
            score: 10,
            num_episodes_watched: 28,
            updated_at: '2024-04-04T00:00:00+00:00',
          },
        })
      );

      const entry = await client.getAnimeListEntry(42);
      expect(entry).toEqual({
        mediaId: 42,
        title: 'Frieren',
        status: 'completed',
        score: 10,
        progress: 28,
        updatedAt: Math.floor(Date.parse('2024-04-04T00:00:00+00:00') / 1000),
      });
    });

    it('returns null when the anime exists but the viewer has no list entry', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      // No my_list_status → the viewer has not added this anime → nothing to pull.
      fetchMock.mockResolvedValueOnce(mkResponse(200, { id: 7, title: 'Unlisted' }));
      await expect(client.getAnimeListEntry(7)).resolves.toBeNull();
    });
  });

  // ============================================
  // updateListStatus — PUT, form-encoding, field asymmetry
  // ============================================

  describe('updateListStatus', () => {
    it('uses PUT with form-encoded body and the num_watched_episodes WRITE field', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          status: 'watching',
          score: 8,
          num_episodes_watched: 5,
          updated_at: '2024-05-05T00:00:00+00:00',
        })
      );

      await client.updateListStatus({ malId: 321, status: 'watching', score: 8, progress: 5 });

      const opts = optsOf();
      expect(opts.method).toBe('PUT');
      expect(headerOf('Content-Type')).toBe('application/x-www-form-urlencoded');
      expect(urlOf()).toBe('https://api.myanimelist.net/v2/anime/321/my_list_status');

      const body = new URLSearchParams(opts.body as string);
      expect(body.get('status')).toBe('watching');
      expect(body.get('score')).toBe('8');
      // WRITE uses num_watched_episodes (NOT the response's num_episodes_watched)
      expect(body.get('num_watched_episodes')).toBe('5');
      expect(body.get('num_episodes_watched')).toBeNull();
    });

    it('omits absent fields from the body (no clobber of untouched remote values)', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, { status: 'completed', score: 0, num_episodes_watched: 12 })
      );

      await client.updateListStatus({ malId: 1, progress: 12 });

      const body = new URLSearchParams(optsOf().body as string);
      expect(body.get('num_watched_episodes')).toBe('12');
      expect(body.get('status')).toBeNull();
      expect(body.get('score')).toBeNull();
    });

    it('rounds the local 0-10 score to an integer (1:1, MAL is integer-only)', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, { status: 'watching', num_episodes_watched: 0 })
      );
      await client.updateListStatus({ malId: 1, score: 7.6 });
      expect(new URLSearchParams(optsOf().body as string).get('score')).toBe('8');
    });

    it('parses the response num_episodes_watched -> progress and updated_at -> epoch seconds', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          status: 'completed',
          score: 9,
          num_episodes_watched: 24,
          updated_at: '2024-06-06T00:00:00+00:00',
        })
      );

      const result = await client.updateListStatus({ malId: 1, status: 'completed' });
      expect(result).toEqual({
        status: 'completed',
        score: 9,
        progress: 24,
        updatedAt: Math.floor(Date.parse('2024-06-06T00:00:00+00:00') / 1000),
      });
    });
  });

  // ============================================
  // deleteListStatus — DELETE, 404-as-success
  // ============================================

  describe('deleteListStatus', () => {
    it('issues a DELETE to my_list_status with the Bearer header', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(mkResponse(200, {}));
      await client.deleteListStatus(42);
      expect(optsOf().method).toBe('DELETE');
      expect(urlOf()).toBe('https://api.myanimelist.net/v2/anime/42/my_list_status');
      expect(headerOf('Authorization')).toBe('Bearer tok');
    });

    it('treats a 404 as idempotent success (no throw)', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(mkResponse(404, { error: 'not_found' }));
      await expect(client.deleteListStatus(99)).resolves.toBeUndefined();
    });
  });

  // ============================================
  // searchAnime — mapping
  // ============================================

  describe('searchAnime', () => {
    it('maps id/title/main_picture (medium, falling back to large)', async () => {
      process.env.MAL_CLIENT_ID = 'pub';
      const client = new MalClient();
      fetchMock.mockResolvedValueOnce(
        mkResponse(200, {
          data: [
            {
              node: { id: 1, title: 'A', main_picture: { medium: 'a-med.jpg', large: 'a-lg.jpg' } },
            },
            { node: { id: 2, title: 'B', main_picture: { large: 'b-lg.jpg' } } },
            { node: { id: 3, title: 'C' } },
            { node: null },
          ],
        })
      );

      const results = await client.searchAnime('q');
      expect(results).toEqual([
        { id: 1, title: 'A', mainPicture: 'a-med.jpg' },
        { id: 2, title: 'B', mainPicture: 'b-lg.jpg' },
        { id: 3, title: 'C', mainPicture: undefined },
      ]);
    });

    it('clamps an over-long query to a word boundary (MAL 400s "invalid q" otherwise)', async () => {
      process.env.MAL_CLIENT_ID = 'pub';
      const client = new MalClient();
      fetchMock.mockResolvedValueOnce(mkResponse(200, { data: [] }));

      const longTitle = 'Otonari no Tenshi-sama ni Itsunomanika Dame Ningen ni Sareteita Ken'; // 67 chars
      await client.searchAnime(longTitle);

      const sentQ = new URL(urlOf()).searchParams.get('q') ?? '';
      expect(sentQ.length).toBeLessThanOrEqual(64);
      expect(longTitle.startsWith(sentQ)).toBe(true); // a clean prefix, not garbled
      expect(sentQ.endsWith(' ')).toBe(false); // trimmed at the boundary
    });

    it('leaves a short query untouched', async () => {
      process.env.MAL_CLIENT_ID = 'pub';
      const client = new MalClient();
      fetchMock.mockResolvedValueOnce(mkResponse(200, { data: [] }));

      await client.searchAnime('Frieren');
      expect(new URL(urlOf()).searchParams.get('q')).toBe('Frieren');
    });
  });

  // ============================================
  // Resilience — retry / Retry-After / non-retryable
  // ============================================

  describe('resilience', () => {
    it('retries on 429 respecting Retry-After', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock
        .mockResolvedValueOnce(mkResponse(429, {}, { 'Retry-After': '1' }))
        .mockResolvedValueOnce(mkResponse(200, { id: 1, name: 'x' }));

      const promise = client.getViewer();
      await jest.advanceTimersByTimeAsync(1001);
      await expect(promise).resolves.toMatchObject({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting retries on persistent 429', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockImplementation(async () => mkResponse(429, {}, { 'Retry-After': '1' }));
      const promise = client.getViewer().catch(err => err);
      for (let i = 0; i < 5; i++) {
        await jest.advanceTimersByTimeAsync(1500);
      }
      const err = await promise;
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toMatch(/rate limit/i);
    });

    it('retries on retryable network errors (fetch failed)', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      const networkErr = Object.assign(new Error('fetch failed'), { name: 'TypeError' });
      fetchMock
        .mockRejectedValueOnce(networkErr)
        .mockResolvedValueOnce(mkResponse(200, { id: 9, name: 'y' }));

      const promise = client.getViewer();
      await jest.advanceTimersByTimeAsync(2500);
      await expect(promise).resolves.toMatchObject({ id: 9 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws on non-OK non-429 (incl. 5xx) without retrying', async () => {
      const client = new MalClient(tokenPortReturning('tok'));
      fetchMock.mockResolvedValueOnce(mkResponse(500, { error: 'boom' }));
      await expect(client.getViewer()).rejects.toThrow(/HTTP 500/i);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
