jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockStartOAuth = jest.fn();
jest.mock('../../auth/anilist-oauth', () => ({ startAniListOAuth: mockStartOAuth }));

const mockStore = { saveSession: jest.fn(), clear: jest.fn(), getStatus: jest.fn() };
jest.mock('../../auth/anilist-token-store', () => ({
  saveSession: (...a: unknown[]) => mockStore.saveSession(...a),
  clear: (...a: unknown[]) => mockStore.clear(...a),
  getStatus: (...a: unknown[]) => mockStore.getStatus(...a),
}));

const mockGetViewer = jest.fn();
jest.mock('../../../modules/anime/anilist-client', () => ({
  AniListClient: jest.fn().mockImplementation(() => ({ getViewer: mockGetViewer })),
}));

import { ipcMain } from 'electron';
import { registerAniListAuthHandlers, cleanupAniListAuthHandlers } from '../anilist-auth';

const viewer = { id: 7, name: 'Neo', avatar: 'a.png' };

describe('registerAniListAuthHandlers', () => {
  const origEnv = process.env.ANILIST_CLIENT_ID;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    mockStartOAuth.mockReset();
    mockGetViewer.mockReset();
    Object.values(mockStore).forEach(fn => fn.mockReset());
    process.env.ANILIST_CLIENT_ID = 'client-123';
  });

  afterAll(() => {
    process.env.ANILIST_CLIENT_ID = origEnv;
  });

  it('connect runs OAuth, fetches viewer, saves session, returns status', async () => {
    mockStartOAuth.mockResolvedValue({ accessToken: 'tok', expiresIn: 1000 });
    mockGetViewer.mockResolvedValue(viewer);
    mockStore.getStatus.mockReturnValue({ connected: true, viewer, expiresAt: 123 });

    registerAniListAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('anilist-auth:connect');

    expect(mockStartOAuth).toHaveBeenCalledWith('client-123');
    expect(mockGetViewer).toHaveBeenCalled();
    expect(mockStore.saveSession).toHaveBeenCalledWith('tok', 1000, viewer);
    expect(result).toEqual({ connected: true, viewer, expiresAt: 123 });
  });

  it('connect throws when client id is not configured', async () => {
    process.env.ANILIST_CLIENT_ID = '';
    registerAniListAuthHandlers();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('anilist-auth:connect')
    ).rejects.toThrow(/not configured/i);
    expect(mockStartOAuth).not.toHaveBeenCalled();
  });

  it('disconnect clears the store', async () => {
    registerAniListAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('anilist-auth:disconnect');
    expect(mockStore.clear).toHaveBeenCalled();
  });

  it('status returns getStatus()', async () => {
    mockStore.getStatus.mockReturnValue({ connected: false });
    registerAniListAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('anilist-auth:status');
    expect(result).toEqual({ connected: false });
  });

  it('status falls back to disconnected on error', async () => {
    mockStore.getStatus.mockImplementation(() => {
      throw new Error('boom');
    });
    registerAniListAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('anilist-auth:status');
    expect(result).toEqual({ connected: false });
  });

  it('cleanup removes the handlers', () => {
    registerAniListAuthHandlers();
    cleanupAniListAuthHandlers();
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('anilist-auth:connect');
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('anilist-auth:disconnect');
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('anilist-auth:status');
  });
});
