import { ipcMain } from 'electron';
import { createMainLogger } from '../logging/logger';
import {
  findPlayingVideoFrame,
  injectSkipButtonIntoFrame,
  probeFrames,
  seekActiveVideo,
  type ProbeResult,
  type SeekResult,
} from '../browser/player-skip';
import { handle } from './with-ipc-handler';
import { playerInjectButtonSchema, playerProbeSchema, playerSeekRelativeSchema } from './schemas';

const logger = createMainLogger('IPC:PlayerSkip');

/**
 * Defensive bound on the seek delta. The caller is the renderer dock; this
 * just keeps a typo (`12000000`) from making the player jump to garbage.
 */
const MAX_DELTA_SECONDS = 60 * 60 * 6; // 6 hours, comfortably above any episode

function clampDelta(delta: number): number {
  if (!Number.isFinite(delta)) return 0;
  if (delta > MAX_DELTA_SECONDS) return MAX_DELTA_SECONDS;
  if (delta < -MAX_DELTA_SECONDS) return -MAX_DELTA_SECONDS;
  return delta;
}

export function registerPlayerSkipHandlers(): void {
  handle<[{ webContentsId: number; deltaSeconds: number }], SeekResult>(
    'player:seek-relative',
    async (_event, { webContentsId, deltaSeconds }) => {
      const clamped = clampDelta(deltaSeconds);
      logger.info(`player:seek-relative wc=${webContentsId} delta=${clamped}`);
      return seekActiveVideo(webContentsId, clamped);
    },
    { schema: playerSeekRelativeSchema }
  );

  handle<[{ webContentsId: number }], ProbeResult>(
    'player:probe',
    async (_event, { webContentsId }) => {
      logger.info(`player:probe wc=${webContentsId}`);
      return probeFrames(webContentsId);
    },
    { schema: playerProbeSchema }
  );

  // Stretch goal: inject a button into the playing iframe DOM. Returns the
  // frame URL on success so the dock can surface "injected into X".
  handle<
    [{ webContentsId: number; deltaSeconds: number }],
    { ok: boolean; reason?: string; frameUrl?: string }
  >(
    'player:inject-button',
    async (_event, { webContentsId, deltaSeconds }) => {
      const clamped = clampDelta(deltaSeconds);
      logger.info(`player:inject-button wc=${webContentsId} delta=${clamped}`);
      return injectSkipButtonIntoFrame(webContentsId, clamped);
    },
    { schema: playerInjectButtonSchema }
  );

  // Diagnostic-only: also expose findPlayingVideoFrame raw, so the dock can
  // confirm "main process reached a playing frame" without paying for the
  // full probe payload.
  ipcMain.handle('player:find-playing-frame', async (_event, payload: unknown) => {
    const wcId = (payload as { webContentsId?: unknown })?.webContentsId;
    if (typeof wcId !== 'number') return null;
    return findPlayingVideoFrame(wcId);
  });
}

export function cleanupPlayerSkipHandlers(): void {
  ipcMain.removeHandler('player:seek-relative');
  ipcMain.removeHandler('player:probe');
  ipcMain.removeHandler('player:inject-button');
  ipcMain.removeHandler('player:find-playing-frame');
}
