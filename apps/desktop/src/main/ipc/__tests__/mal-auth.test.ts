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
jest.mock('../../auth/mal-oauth', () => ({ startMalOAuth: mockStartOAuth }));

const mockFetchViewer = jest.fn();
jest.mock('../../auth/mal-viewer', () => ({ fetchMalViewer: mockFetchViewer }));

const mockStore = { saveSession: jest.fn(), clear: jest.fn(), getStatus: jest.fn() };
jest.mock('../../auth/mal-token-store', () => ({
  saveSession: (...a: unknown[]) => mockStore.saveSession(...a),
  clear: (...a: unknown[]) => mockStore.clear(...a),
  getStatus: (...a: unknown[]) => mockStore.getStatus(...a),
}));

import { ipcMain } from 'electron';
import { registerMalAuthHandlers, cleanupMalAuthHandlers } from '../mal-auth';

const viewer = { id: 7, name: 'Neo', avatar: 'a.png' };

describe('registerMalAuthHandlers', () => {
  const origId = process.env.MAL_CLIENT_ID;
  const origSecret = process.env.MAL_CLIENT_SECRET;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    mockStartOAuth.mockReset();
    mockFetchViewer.mockReset();
    Object.values(mockStore).forEach(fn => fn.mockReset());
    process.env.MAL_CLIENT_ID = 'client-123';
    delete process.env.MAL_CLIENT_SECRET;
  });

  afterAll(() => {
    process.env.MAL_CLIENT_ID = origId;
    process.env.MAL_CLIENT_SECRET = origSecret;
  });

  it('connect runs OAuth, fetches viewer, saves both tokens, returns status', async () => {
    mockStartOAuth.mockResolvedValue({
      accessToken: 'tok',
      refreshToken: 'ref',
      expiresIn: 3600,
    });
    mockFetchViewer.mockResolvedValue(viewer);
    mockStore.getStatus.mockReturnValue({ connected: true, viewer, expiresAt: 123 });

    registerMalAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('mal-auth:connect');

    // No secret configured → passed undefined.
    expect(mockStartOAuth).toHaveBeenCalledWith('client-123', undefined);
    expect(mockFetchViewer).toHaveBeenCalledWith('tok');
    expect(mockStore.saveSession).toHaveBeenCalledWith(
      { accessToken: 'tok', refreshToken: 'ref' },
      3600,
      viewer
    );
    expect(result).toEqual({ connected: true, viewer, expiresAt: 123 });
  });

  it('connect still persists the token pair when the viewer fetch fails (viewer is decoration)', async () => {
    mockStartOAuth.mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 });
    mockFetchViewer.mockRejectedValue(new Error('profile 500'));
    mockStore.getStatus.mockReturnValue({ connected: true, expiresAt: 123 });

    registerMalAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('mal-auth:connect');

    // Tokens saved with an undefined viewer rather than discarding a good session.
    expect(mockStore.saveSession).toHaveBeenCalledWith(
      { accessToken: 'tok', refreshToken: 'ref' },
      3600,
      undefined
    );
    expect(result).toEqual({ connected: true, expiresAt: 123 });
  });

  it('connect forwards the client secret to the OAuth flow when configured', async () => {
    process.env.MAL_CLIENT_SECRET = 'shh';
    mockStartOAuth.mockResolvedValue({ accessToken: 't', refreshToken: 'r', expiresIn: 3600 });
    mockFetchViewer.mockResolvedValue(viewer);
    mockStore.getStatus.mockReturnValue({ connected: true });

    registerMalAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('mal-auth:connect');
    expect(mockStartOAuth).toHaveBeenCalledWith('client-123', 'shh');
  });

  it('connect throws when client id is not configured', async () => {
    process.env.MAL_CLIENT_ID = '';
    registerMalAuthHandlers();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('mal-auth:connect')
    ).rejects.toThrow(/not configured/i);
    expect(mockStartOAuth).not.toHaveBeenCalled();
  });

  it('disconnect clears the store', async () => {
    registerMalAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('mal-auth:disconnect');
    expect(mockStore.clear).toHaveBeenCalled();
  });

  it('status returns getStatus()', async () => {
    mockStore.getStatus.mockReturnValue({ connected: false });
    registerMalAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('mal-auth:status');
    expect(result).toEqual({ connected: false });
  });

  it('status falls back to disconnected on error', async () => {
    mockStore.getStatus.mockImplementation(() => {
      throw new Error('boom');
    });
    registerMalAuthHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('mal-auth:status');
    expect(result).toEqual({ connected: false });
  });

  it('cleanup removes the handlers', () => {
    registerMalAuthHandlers();
    cleanupMalAuthHandlers();
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('mal-auth:connect');
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('mal-auth:disconnect');
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('mal-auth:status');
  });
});
