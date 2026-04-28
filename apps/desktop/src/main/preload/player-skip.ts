import { ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shiroani/shared';

/**
 * Player-skip POC bridge — exposed under `electronAPI.playerSkip`.
 *
 * The renderer passes the webview's `getWebContentsId()` so the main process
 * can walk that webContents' frame tree. All channels return rich diagnostic
 * payloads so the POC dock can show before/after timestamps and frame trees.
 */
export const playerSkipApi: ElectronAPI['playerSkip'] = {
  seekRelative: (webContentsId: number, deltaSeconds: number) =>
    ipcRenderer.invoke('player:seek-relative', { webContentsId, deltaSeconds }) as Promise<{
      ok: boolean;
      reason?: string;
      before?: number;
      after?: number;
      frameUrl?: string;
    }>,

  probe: (webContentsId: number) =>
    ipcRenderer.invoke('player:probe', { webContentsId }) as Promise<{
      webContentsId: number;
      topUrl: string;
      frames: Array<{
        url: string;
        origin: string;
        processId: number;
        routingId: number;
        detached: boolean;
        videos: Array<{
          width: number;
          height: number;
          currentTime: number;
          duration: number;
          paused: boolean;
          src: string;
          playing: boolean;
        }>;
        error?: string;
      }>;
      playingFrameIndices: number[];
      startedAt: number;
      durationMs: number;
    }>,

  injectButton: (webContentsId: number, deltaSeconds: number) =>
    ipcRenderer.invoke('player:inject-button', { webContentsId, deltaSeconds }) as Promise<{
      ok: boolean;
      reason?: string;
      frameUrl?: string;
    }>,

  attachController: params =>
    ipcRenderer.invoke('player-skip:attach-controller', params) as Promise<{
      ok: boolean;
      mode: 'aniskip' | 'fallback' | 'none';
    }>,

  detachController: params =>
    ipcRenderer.invoke('player-skip:detach-controller', params) as Promise<{ ok: boolean }>,

  updateController: params =>
    ipcRenderer.invoke('player-skip:update-controller', params) as Promise<{
      ok: boolean;
      mode: 'aniskip' | 'fallback' | 'none';
    }>,
};
