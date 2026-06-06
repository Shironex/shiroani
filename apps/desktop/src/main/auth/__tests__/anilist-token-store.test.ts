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
import { saveSession, getToken, getStatus, clear } from '../anilist-token-store';

const viewer = { id: 1, name: 'Tester', avatar: 'a.png' };
const SESSION_KEY = 'anilist-session';

describe('anilist-token-store', () => {
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

  it('encrypts the token and round-trips via base64 when safeStorage is available', () => {
    saveSession('secret-token', 1000, viewer);

    const saved = mockStore.set.mock.calls[0][1];
    expect(saved.encrypted).toBe(true);
    expect(saved.token).not.toContain('secret-token'); // stored as base64 of ciphertext
    expect(saved.viewer).toEqual(viewer);
    expect(saved.expiresAt).toBeGreaterThan(Date.now());

    mockStore.get.mockReturnValue(saved);
    expect(getToken()).toBe('secret-token');
  });

  it('stores plaintext flagged when safeStorage is unavailable', () => {
    (safeStorage.isEncryptionAvailable as jest.Mock).mockReturnValue(false);
    saveSession('plain-token', 1000, viewer);

    const saved = mockStore.set.mock.calls[0][1];
    expect(saved.encrypted).toBe(false);
    expect(saved.token).toBe('plain-token');

    mockStore.get.mockReturnValue(saved);
    expect(getToken()).toBe('plain-token');
    expect(safeStorage.decryptString).not.toHaveBeenCalled();
  });

  it('getToken returns null when expired', () => {
    mockStore.get.mockReturnValue({
      token: Buffer.from('enc:t').toString('base64'),
      encrypted: true,
      expiresAt: Date.now() - 1000,
      viewer,
    });
    expect(getToken()).toBeNull();
  });

  it('getToken returns null when nothing stored', () => {
    mockStore.get.mockReturnValue(undefined);
    expect(getToken()).toBeNull();
  });

  it('getStatus reports connected with viewer when valid', () => {
    const expiresAt = Date.now() + 100000;
    mockStore.get.mockReturnValue({ token: 'x', encrypted: false, expiresAt, viewer });
    expect(getStatus()).toEqual({ connected: true, viewer, expiresAt });
  });

  it('getStatus reports disconnected when expired or missing', () => {
    mockStore.get.mockReturnValue(undefined);
    expect(getStatus()).toEqual({ connected: false });
    mockStore.get.mockReturnValue({
      token: 'x',
      encrypted: false,
      expiresAt: Date.now() - 1,
      viewer,
    });
    expect(getStatus()).toEqual({ connected: false });
  });

  it('clear deletes the session key', () => {
    clear();
    expect(mockStore.delete).toHaveBeenCalledWith(SESSION_KEY);
  });

  it('getToken returns null when decryption throws', () => {
    (safeStorage.decryptString as jest.Mock).mockImplementation(() => {
      throw new Error('bad');
    });
    mockStore.get.mockReturnValue({
      token: 'zz',
      encrypted: true,
      expiresAt: Date.now() + 100000,
      viewer,
    });
    expect(getToken()).toBeNull();
  });
});
