jest.mock('electron');
jest.mock('@shiroani/shared', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

const mockStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};
jest.mock('../../store', () => ({ store: mockStore }));

import { safeStorage } from 'electron';
import { saveSession, getSession, getStatus, clear, getSessionEpoch } from '../mal-token-store';

const viewer = { id: 1, name: 'Tester', avatar: 'a.png' };
const SESSION_KEY = 'mal-session';
const tokens = { accessToken: 'access-secret', refreshToken: 'refresh-secret' };

describe('mal-token-store', () => {
  beforeEach(() => {
    mockStore.get.mockReset();
    mockStore.set.mockReset();
    mockStore.delete.mockReset();
    (safeStorage.isEncryptionAvailable as jest.Mock).mockReset().mockReturnValue(true);
    (safeStorage.encryptString as jest.Mock)
      .mockReset()
      .mockImplementation((p: string) => Buffer.from(`enc:${p}`));
    (safeStorage.decryptString as jest.Mock)
      .mockReset()
      .mockImplementation((b: Buffer) => b.toString('utf8').replace(/^enc:/, ''));
  });

  it('encrypts BOTH tokens and round-trips via base64 when safeStorage is available', () => {
    saveSession(tokens, 1000, viewer);

    const saved = mockStore.set.mock.calls[0][1];
    expect(saved.encrypted).toBe(true);
    // Neither secret stored in the clear.
    expect(saved.accessToken).not.toContain('access-secret');
    expect(saved.refreshToken).not.toContain('refresh-secret');
    expect(saved.viewer).toEqual(viewer);
    expect(saved.expiresAt).toBeGreaterThan(Date.now());

    mockStore.get.mockReturnValue(saved);
    const session = getSession();
    expect(session?.accessToken).toBe('access-secret');
    expect(session?.refreshToken).toBe('refresh-secret');
    expect(session?.viewer).toEqual(viewer);
  });

  it('stores plaintext flagged for BOTH tokens when safeStorage is unavailable', () => {
    (safeStorage.isEncryptionAvailable as jest.Mock).mockReturnValue(false);
    saveSession(tokens, 1000, viewer);

    const saved = mockStore.set.mock.calls[0][1];
    expect(saved.encrypted).toBe(false);
    expect(saved.accessToken).toBe('access-secret');
    expect(saved.refreshToken).toBe('refresh-secret');

    mockStore.get.mockReturnValue(saved);
    const session = getSession();
    expect(session?.accessToken).toBe('access-secret');
    expect(session?.refreshToken).toBe('refresh-secret');
    expect(safeStorage.decryptString).not.toHaveBeenCalled();
  });

  it('getSession does NOT null on an expired access token (refresh token outlives it)', () => {
    mockStore.get.mockReturnValue({
      accessToken: 'access-secret',
      refreshToken: 'refresh-secret',
      encrypted: false,
      expiresAt: Date.now() - 1000,
      viewer,
    });
    const session = getSession();
    expect(session?.accessToken).toBe('access-secret');
    expect(session?.expiresAt).toBeLessThan(Date.now());
  });

  it('getSession returns null when nothing stored', () => {
    mockStore.get.mockReturnValue(undefined);
    expect(getSession()).toBeNull();
  });

  it('getSession returns null when a token fails to decrypt', () => {
    (safeStorage.decryptString as jest.Mock).mockImplementation(() => {
      throw new Error('bad');
    });
    mockStore.get.mockReturnValue({
      accessToken: 'zz',
      refreshToken: 'yy',
      encrypted: true,
      expiresAt: Date.now() + 100000,
      viewer,
    });
    expect(getSession()).toBeNull();
  });

  it('getStatus reports connected even when the access token is expired', () => {
    const expiresAt = Date.now() - 1;
    mockStore.get.mockReturnValue({
      accessToken: 'x',
      refreshToken: 'y',
      encrypted: false,
      expiresAt,
      viewer,
    });
    // Connected: the refresh token can renew the access token transparently.
    expect(getStatus()).toEqual({ connected: true, viewer, expiresAt });
  });

  it('getStatus reports disconnected only when missing', () => {
    mockStore.get.mockReturnValue(undefined);
    expect(getStatus()).toEqual({ connected: false });
  });

  it('getStatus NEVER includes either token', () => {
    mockStore.get.mockReturnValue({
      accessToken: 'access-secret',
      refreshToken: 'refresh-secret',
      encrypted: false,
      expiresAt: Date.now() + 100000,
      viewer,
    });
    const status = getStatus();
    expect(JSON.stringify(status)).not.toContain('access-secret');
    expect(JSON.stringify(status)).not.toContain('refresh-secret');
  });

  it('clear deletes the session key', () => {
    clear();
    expect(mockStore.delete).toHaveBeenCalledWith(SESSION_KEY);
  });

  it('clear bumps the session epoch (invalidates an in-flight refresh)', () => {
    const before = getSessionEpoch();
    clear();
    expect(getSessionEpoch()).toBe(before + 1);
  });
});
