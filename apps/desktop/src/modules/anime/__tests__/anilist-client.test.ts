import { AniListClient } from '../anilist-client';

const mkResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

describe('AniListClient', () => {
  let client: AniListClient;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    client = new AniListClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchMock = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const authHeaderOf = (callIndex = 0): string | undefined => {
    const opts = fetchMock.mock.calls[callIndex][1] as RequestInit;
    return (opts.headers as Record<string, string>).Authorization;
  };

  it('unauthenticated query sends no Authorization header (behavior unchanged)', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(200, { data: { Media: { id: 1 } } }));
    await client.query('query{}', {});
    expect(authHeaderOf()).toBeUndefined();
  });

  it('getViewer maps avatar.large and attaches the bearer token when present', async () => {
    const tokenPort = { getAccessToken: jest.fn().mockResolvedValue('secret-tok') };
    const authed = new AniListClient(tokenPort);
    fetchMock.mockResolvedValueOnce(
      mkResponse(200, {
        data: {
          Viewer: { id: 42, name: 'Anya', avatar: { large: 'big.png' }, bannerImage: 'b.png' },
        },
      })
    );

    const viewer = await authed.getViewer();
    expect(viewer).toEqual({ id: 42, name: 'Anya', avatar: 'big.png', bannerImage: 'b.png' });
    expect(authHeaderOf()).toBe('Bearer secret-tok');
  });

  it('getViewer sends no auth header when the token port returns null', async () => {
    const tokenPort = { getAccessToken: jest.fn().mockResolvedValue(null) };
    const authed = new AniListClient(tokenPort);
    fetchMock.mockResolvedValueOnce(mkResponse(200, { data: { Viewer: { id: 1, name: 'x' } } }));
    await authed.getViewer();
    expect(authHeaderOf()).toBeUndefined();
  });

  it('happy path returns GraphQL data', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(200, { data: { Media: { id: 1 } } }));
    await expect(client.query('query{}', {})).resolves.toEqual({ Media: { id: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on GraphQL errors without retrying', async () => {
    fetchMock.mockResolvedValueOnce(
      mkResponse(200, { errors: [{ message: 'Not found', status: 404 }] })
    );
    await expect(client.query('query{}')).rejects.toThrow(/GraphQL error/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on non-OK non-429 without retrying', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(500, { error: 'server error' }));
    await expect(client.query('query{}')).rejects.toThrow(/HTTP 500/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on empty data', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(200, {}));
    await expect(client.query('query{}')).rejects.toThrow(/empty data/i);
  });

  it('retries on 429 respecting Retry-After header', async () => {
    fetchMock
      .mockResolvedValueOnce(mkResponse(429, {}, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(mkResponse(200, { data: { ok: true } }));
    const promise = client.query('query{}');
    await jest.advanceTimersByTimeAsync(1001);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries on persistent 429', async () => {
    fetchMock.mockImplementation(async () => mkResponse(429, {}, { 'Retry-After': '1' }));
    const promise = client.query('query{}').catch(err => err);
    // Advance through all retry slots
    for (let i = 0; i < 5; i++) {
      await jest.advanceTimersByTimeAsync(1500);
    }
    const err = await promise;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/rate limit/i);
  });

  it('retries on retryable network errors (fetch failed)', async () => {
    const networkErr = Object.assign(new Error('fetch failed'), { name: 'TypeError' });
    fetchMock
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValueOnce(mkResponse(200, { data: { result: 42 } }));
    const promise = client.query('query{}');
    // First retry delay is defaultRetryDelayMs * 1 = 2000ms
    await jest.advanceTimersByTimeAsync(2500);
    await expect(promise).resolves.toEqual({ result: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable errors', async () => {
    // GraphQL error is not retryable; fetch should be called only once
    fetchMock.mockResolvedValueOnce(
      mkResponse(200, { errors: [{ message: 'Permission denied', status: 403 }] })
    );
    await expect(client.query('query{}')).rejects.toThrow(/GraphQL error/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cachedQuery caches results for the same key', async () => {
    fetchMock.mockImplementation(async () => mkResponse(200, { data: { cached: true } }));
    await client.cachedQuery('key1', 'query{}', {}, 60_000);
    await client.cachedQuery('key1', 'query{}', {}, 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clearCache removes an entry and forces re-fetch', async () => {
    fetchMock.mockImplementation(async () => mkResponse(200, { data: { fresh: true } }));
    await client.cachedQuery('key2', 'query{}', {}, 60_000);
    client.clearCache('key2');
    await client.cachedQuery('key2', 'query{}', {}, 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clearCache() with no args clears everything', async () => {
    fetchMock.mockImplementation(async () => mkResponse(200, { data: { everything: true } }));
    await client.cachedQuery('k1', 'query{}', {}, 60_000);
    await client.cachedQuery('k2', 'query{}', {}, 60_000);
    client.clearCache();
    await client.cachedQuery('k1', 'query{}', {}, 60_000);
    await client.cachedQuery('k2', 'query{}', {}, 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
