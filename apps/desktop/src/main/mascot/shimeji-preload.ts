import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload for the Shimeji roam-mode overlay window. The overlay page is
 * sandboxed and isolated; this bridge is its only line to the engine.
 */

export interface ShimejiConfig {
  /** file:// URL of the directory holding the generated sprite sheets. */
  spriteDirUrl: string;
  manifest: {
    frameSize: number;
    animations: Record<string, { file: string; frames: number; fps: number; loop: boolean }>;
  };
}

export interface ShimejiAnimMessage {
  anim: string;
  facing: 'left' | 'right';
}

const api = {
  onConfig(callback: (config: ShimejiConfig) => void): void {
    ipcRenderer.on('shimeji:config', (_event, config: ShimejiConfig) => callback(config));
  },
  onAnim(callback: (msg: ShimejiAnimMessage) => void): void {
    ipcRenderer.on('shimeji:anim', (_event, msg: ShimejiAnimMessage) => callback(msg));
  },
  /** Toggle click-through. `ignore: true` always forwards mouse moves. */
  setIgnoreMouse(ignore: boolean): void {
    ipcRenderer.send('shimeji:set-ignore-mouse', ignore);
  },
  dragStart(): void {
    ipcRenderer.send('shimeji:drag-start');
  },
  dragEnd(): void {
    ipcRenderer.send('shimeji:drag-end');
  },
  click(): void {
    ipcRenderer.send('shimeji:click');
  },
  contextMenu(x: number, y: number): void {
    ipcRenderer.send('shimeji:context-menu', x, y);
  },
};

export type ShimejiBridge = typeof api;

contextBridge.exposeInMainWorld('shimeji', api);
