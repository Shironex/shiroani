import { ipcRenderer } from 'electron';
import type { ElectronAPI, MascotSpriteScaleMode } from '@shiroani/shared';
import { createIpcListener } from './_shared';

export const overlayApi: ElectronAPI['overlay'] = {
  show: () => ipcRenderer.invoke('overlay:show'),
  hide: () => ipcRenderer.invoke('overlay:hide'),
  toggle: () => ipcRenderer.invoke('overlay:toggle'),
  getStatus: () =>
    ipcRenderer.invoke('overlay:get-status') as Promise<{
      enabled: boolean;
      visible: boolean;
      x: number;
      y: number;
    }>,
  setEnabled: (enabled: boolean) => ipcRenderer.invoke('overlay:set-enabled', enabled),
  isEnabled: () => ipcRenderer.invoke('overlay:is-enabled') as Promise<boolean>,
  setSize: (size: number) => ipcRenderer.invoke('overlay:set-size', size),
  getSize: () => ipcRenderer.invoke('overlay:get-size') as Promise<number>,
  setVisibilityMode: (mode: string) => ipcRenderer.invoke('overlay:set-visibility-mode', mode),
  getVisibilityMode: () => ipcRenderer.invoke('overlay:get-visibility-mode') as Promise<string>,
  setPositionLocked: (locked: boolean) => ipcRenderer.invoke('overlay:set-position-locked', locked),
  isPositionLocked: () => ipcRenderer.invoke('overlay:get-position-locked') as Promise<boolean>,
  resetPosition: () => ipcRenderer.invoke('overlay:reset-position'),
  setAnimationEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('overlay:set-animation-enabled', enabled),
  isAnimationEnabled: () => ipcRenderer.invoke('overlay:get-animation-enabled') as Promise<boolean>,
  setMode: (mode: string) => ipcRenderer.invoke('overlay:set-mode', mode),
  getMode: () => ipcRenderer.invoke('overlay:get-mode') as Promise<'static' | 'roam'>,
  pickSprite: () =>
    ipcRenderer.invoke('overlay:pick-sprite') as Promise<{
      fileName: string;
      url: string;
    } | null>,
  removeSprite: (fileName: string) =>
    ipcRenderer.invoke('overlay:remove-sprite', fileName) as Promise<void>,
  getSpriteUrl: (fileName: string) =>
    ipcRenderer.invoke('overlay:get-sprite-url', fileName) as Promise<string | null>,
  setSpriteScale: (mode: MascotSpriteScaleMode) =>
    ipcRenderer.invoke('overlay:set-sprite-scale', mode) as Promise<{
      success: boolean;
      mode: MascotSpriteScaleMode;
    }>,
  getSpriteScale: () =>
    ipcRenderer.invoke('overlay:get-sprite-scale') as Promise<MascotSpriteScaleMode>,
  onNavigate: createIpcListener<string>('navigate'),
};
