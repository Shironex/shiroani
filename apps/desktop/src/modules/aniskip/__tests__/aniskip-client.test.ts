import { AniSkipClient } from '../aniskip-client';
import type { AniSkipResponse } from '../types';

const mkResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const skipResponse = (results: AniSkipResponse['results']): AniSkipResponse => ({
  found: results.length > 0,
  results,
  message: 'success',
  statusCode: 200,
});

const opResult = {
  interval: { startTime: 638.489, endTime: 728.489 },
  skipType: 'op' as const,
  skipId: 'abc',
  episodeLength: 1421,
};

const edResult = {
  interval: { startTime: 1331.713, endTime: 1421.713 },
  skipType: 'ed' as const,
  skipId: 'def',
  episodeLength: 1421,
};

describe('AniSkipClient', () => {
  let client: AniSkipClient;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    client = new AniSkipClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchMock = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns results on a successful response', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(200, skipResponse([opResult, edResult])));
    const results = await client.getSkipTimes(9253, 1, 0);
    expect(results).toHaveLength(2);
    expect(results[0].skipType).toBe('op');
    expect(results[1].skipType).toBe('ed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns [] when found is false', async () => {
    fetchMock.mockResolvedValueOnce(
      mkResponse(200, { found: false, results: [], message: 'not found', statusCode: 200 })
    );
    const results = await client.getSkipTimes(1, 1, 0);
    expect(results).toEqual([]);
  });

  it('returns [] on 404', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(404, ''));
    const results = await client.getSkipTimes(999, 99, 0);
    expect(results).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns [] on rate limit exhaustion (does not throw)', async () => {
    fetchMock.mockImplementation(async () => mkResponse(429, {}, { 'Retry-After': '1' }));
    const promise = client.getSkipTimes(1, 1, 0);
    for (let i = 0; i < 6; i++) {
      await jest.advanceTimersByTimeAsync(1500);
    }
    const results = await promise;
    expect(results).toEqual([]);
  });

  it('returns cached results on second call without re-fetching', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(200, skipResponse([opResult])));
    await client.getSkipTimes(9253, 1, 0);
    await client.getSkipTimes(9253, 1, 0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses different cache keys for different episodes', async () => {
    fetchMock.mockImplementation(async () => mkResponse(200, skipResponse([opResult])));
    await client.getSkipTimes(9253, 1, 0);
    await client.getSkipTimes(9253, 2, 0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses different cache keys for different episodeLengths', async () => {
    fetchMock.mockImplementation(async () => mkResponse(200, skipResponse([opResult])));
    await client.getSkipTimes(9253, 1, 1400);
    await client.getSkipTimes(9253, 1, 1500);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clearCache removes cached entries', async () => {
    fetchMock.mockImplementation(async () => mkResponse(200, skipResponse([opResult])));
    await client.getSkipTimes(9253, 1, 0);
    client.clearCache();
    await client.getSkipTimes(9253, 1, 0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 and succeeds on subsequent attempt', async () => {
    fetchMock
      .mockResolvedValueOnce(mkResponse(429, {}, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(mkResponse(200, skipResponse([opResult])));
    const promise = client.getSkipTimes(9253, 1, 0);
    await jest.advanceTimersByTimeAsync(1500);
    const results = await promise;
    expect(results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on non-OK, non-404, non-429 response', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(500, 'internal server error'));
    await expect(client.getSkipTimes(9253, 1, 0)).rejects.toThrow(/HTTP 500/i);
  });

  it('includes types query params in URL', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(200, skipResponse([opResult])));
    await client.getSkipTimes(9253, 1, 0, ['op']);
    const calledUrl = (fetchMock.mock.calls[0] as [string])[0];
    expect(calledUrl).toContain('types=op');
    expect(calledUrl).not.toContain('types=ed');
  });

  it('rounds episodeLength in cache key', async () => {
    fetchMock.mockResolvedValue(mkResponse(200, skipResponse([opResult])));
    await client.getSkipTimes(9253, 1, 1420.7);
    await client.getSkipTimes(9253, 1, 1421.3);
    // Both round to 1421 — single fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
