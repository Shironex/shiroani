jest.mock('electron');
jest.mock('@shiroani/shared', () => ({
  DEFAULT_MAL_CLIENT_ID: '',
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

const mockStore = { getSession: jest.fn(), saveSession: jest.fn(), getSessionEpoch: jest.fn() };
jest.mock('../mal-token-store', () => ({
  getSession: (...a: unknown[]) => mockStore.getSession(...a),
  saveSession: (...a: unknown[]) => mockStore.saveSession(...a),
  getSessionEpoch: (...a: unknown[]) => mockStore.getSessionEpoch(...a),
}));

const mockRefresh = jest.fn();
jest.mock('../mal-token-request', () => ({
  refreshMalToken: (...a: unknown[]) => mockRefresh(...a),
}));

import { ElectronMalTokenAdapter } from '../mal-token.adapter';

const viewer = { id: 1, name: 'Tester' };

/** Deferred promise helper for controlling refresh timing in single-flight tests. */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
} {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('ElectronMalTokenAdapter', () => {
  const origId = process.env.MAL_CLIENT_ID;
  const origSecret = process.env.MAL_CLIENT_SECRET;

  beforeEach(() => {
    mockStore.getSession.mockReset();
    mockStore.saveSession.mockReset();
    mockStore.getSessionEpoch.mockReset().mockReturnValue(0);
    mockRefresh.mockReset();
    process.env.MAL_CLIENT_ID = 'client-1';
    delete process.env.MAL_CLIENT_SECRET;
  });

  afterAll(() => {
    process.env.MAL_CLIENT_ID = origId;
    process.env.MAL_CLIENT_SECRET = origSecret;
  });

  it('returns null when no session is stored', async () => {
    mockStore.getSession.mockReturnValue(null);
    const adapter = new ElectronMalTokenAdapter();
    expect(await adapter.getAccessToken()).toBeNull();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('returns the stored access token unchanged when it is comfortably valid', async () => {
    mockStore.getSession.mockReturnValue({
      accessToken: 'valid-access',
      refreshToken: 'r',
      expiresAt: Date.now() + 10 * 60 * 1000,
      viewer,
    });
    const adapter = new ElectronMalTokenAdapter();
    expect(await adapter.getAccessToken()).toBe('valid-access');
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('lazily refreshes + rotates BOTH tokens when the access token is expired', async () => {
    mockStore.getSession.mockReturnValue({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() - 1000,
      viewer,
    });
    mockRefresh.mockResolvedValue({
      accessToken: 'fresh-access',
      refreshToken: 'fresh-refresh',
      expiresIn: 3600,
    });

    const adapter = new ElectronMalTokenAdapter();
    const token = await adapter.getAccessToken();

    expect(token).toBe('fresh-access');
    expect(mockRefresh).toHaveBeenCalledWith({
      clientId: 'client-1',
      clientSecret: undefined,
      refreshToken: 'old-refresh',
    });
    // Persists the NEW pair, preserving the cached viewer.
    expect(mockStore.saveSession).toHaveBeenCalledWith(
      { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' },
      3600,
      viewer
    );
  });

  it('refreshes within the near-expiry skew window (before actual expiry)', async () => {
    mockStore.getSession.mockReturnValue({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      // Expires in 30s — inside the 60s skew → should refresh.
      expiresAt: Date.now() + 30 * 1000,
      viewer,
    });
    mockRefresh.mockResolvedValue({
      accessToken: 'fresh-access',
      refreshToken: 'fresh-refresh',
      expiresIn: 3600,
    });
    const adapter = new ElectronMalTokenAdapter();
    expect(await adapter.getAccessToken()).toBe('fresh-access');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('forwards the client secret to refresh when configured', async () => {
    process.env.MAL_CLIENT_SECRET = 'shh';
    mockStore.getSession.mockReturnValue({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() - 1,
      viewer,
    });
    mockRefresh.mockResolvedValue({ accessToken: 'a', refreshToken: 'b', expiresIn: 3600 });
    const adapter = new ElectronMalTokenAdapter();
    await adapter.getAccessToken();
    expect(mockRefresh).toHaveBeenCalledWith(
      expect.objectContaining({ clientSecret: 'shh', refreshToken: 'old-refresh' })
    );
  });

  it('single-flight: concurrent callers trigger exactly ONE refresh', async () => {
    mockStore.getSession.mockReturnValue({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() - 1,
      viewer,
    });
    const d = deferred<{ accessToken: string; refreshToken: string; expiresIn: number }>();
    mockRefresh.mockReturnValue(d.promise);

    const adapter = new ElectronMalTokenAdapter();
    const p1 = adapter.getAccessToken();
    const p2 = adapter.getAccessToken();
    const p3 = adapter.getAccessToken();

    d.resolve({ accessToken: 'fresh', refreshToken: 'fresh-r', expiresIn: 3600 });
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect([r1, r2, r3]).toEqual(['fresh', 'fresh', 'fresh']);
  });

  it('does NOT persist rotated tokens when a disconnect lands mid-refresh (no session resurrection)', async () => {
    mockStore.getSession.mockReturnValue({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() - 1,
      viewer,
    });
    // Epoch is 0 when the refresh starts, but 1 after it resolves → a disconnect
    // (which bumps the epoch) happened while the refresh was in flight.
    mockStore.getSessionEpoch.mockReturnValueOnce(0).mockReturnValue(1);
    mockRefresh.mockResolvedValue({
      accessToken: 'fresh',
      refreshToken: 'fresh-r',
      expiresIn: 3600,
    });

    const adapter = new ElectronMalTokenAdapter();
    const token = await adapter.getAccessToken();

    // The caller still gets the fresh token (its request can finish), but the
    // cleared store is NOT re-written.
    expect(token).toBe('fresh');
    expect(mockStore.saveSession).not.toHaveBeenCalled();
  });

  it('a failed refresh clears the in-flight promise so a later call can retry', async () => {
    mockStore.getSession.mockReturnValue({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() - 1,
      viewer,
    });

    // First refresh rejects.
    mockRefresh.mockRejectedValueOnce(new Error('network down'));
    const adapter = new ElectronMalTokenAdapter();
    expect(await adapter.getAccessToken()).toBeNull();

    // Second call must attempt a NEW refresh, not reuse the rejected promise.
    mockRefresh.mockResolvedValueOnce({
      accessToken: 'fresh',
      refreshToken: 'fresh-r',
      expiresIn: 3600,
    });
    expect(await adapter.getAccessToken()).toBe('fresh');
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });

  it('returns null (no refresh) when the client id is not configured', async () => {
    process.env.MAL_CLIENT_ID = '';
    mockStore.getSession.mockReturnValue({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() - 1,
      viewer,
    });
    const adapter = new ElectronMalTokenAdapter();
    expect(await adapter.getAccessToken()).toBeNull();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
