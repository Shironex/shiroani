import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import {
  BACKEND_REQUEST_CHANNELS,
  type BackendEventPublisher,
  type BackendRequestChannel,
} from '@shiroani/shared';
import type { InflightTracker } from '../../modules/kernel/inflight-tracker';
import type { BackendHandlers } from '../../modules/kernel/backend-handlers';
import { createMainLogger } from '../logging/logger';
import { IpcError, VALIDATION_ERROR_CODES } from './errors';
import { handle } from './with-ipc-handler';

const logger = createMainLogger('BackendIpc');

type GetMainWindow = () => BrowserWindow | null;

/**
 * Whether a frame's URL is the app's renderer. Only protocol and location count:
 * a packaged page keeps its `file://` path but may gain a hash or query. Windows
 * paths are case-insensitive and can differ in drive letter case.
 */
export function isRendererUrl(
  frameUrl: string,
  rendererUrl: string,
  platform: NodeJS.Platform = process.platform
): boolean {
  let frame: URL;
  let expected: URL;
  try {
    frame = new URL(frameUrl);
    expected = new URL(rendererUrl);
  } catch {
    return false;
  }
  if (frame.protocol !== expected.protocol) return false;
  if (expected.protocol !== 'file:') return frame.origin === expected.origin;

  const normalize = (pathname: string): string =>
    platform === 'win32' ? decodeURI(pathname).toLowerCase() : decodeURI(pathname);
  try {
    return normalize(frame.pathname) === normalize(expected.pathname);
  } catch {
    return false;
  }
}

/**
 * Whether a call comes from the main window's own top-level page. `event.sender`
 * alone is not enough: iframes share the main webContents. A frame that has gone
 * away during navigation reads as null, or throws on access, and is rejected.
 */
export function isTrustedSender(
  event: Pick<IpcMainInvokeEvent, 'sender' | 'senderFrame'>,
  mainWindow: BrowserWindow | null,
  rendererUrl: string
): boolean {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  try {
    const { webContents } = mainWindow;
    const frame = event.senderFrame;
    if (event.sender !== webContents || !frame || frame !== webContents.mainFrame) return false;
    return isRendererUrl(frame.url, rendererUrl);
  } catch {
    return false;
  }
}

export interface BackendIpcOptions {
  getMainWindow: GetMainWindow;
  /** URL the main window loads. See `getRendererUrl`. */
  rendererUrl: string;
}

interface BackendIpcTarget {
  handlers: BackendHandlers;
  inflight: InflightTracker;
  addDisposer(name: string, dispose: () => void): void;
}

/**
 * Bind backend handlers to IPC. Call once per process, outside the per-window
 * `registerIpcHandlers`: the window is resolved per call so a recreated window
 * keeps working, and `ipcMain.handle` throws if a channel is registered twice.
 */
export function registerBackendIpc(backend: BackendIpcTarget, options: BackendIpcOptions): void {
  const invoke = <C extends BackendRequestChannel>(channel: C, payload: unknown) =>
    backend.inflight.track(backend.handlers[channel](payload));

  for (const channel of BACKEND_REQUEST_CHANNELS) {
    handle(channel, (event, payload: unknown) => {
      if (!isTrustedSender(event, options.getMainWindow(), options.rendererUrl)) {
        logger.warn(`[security] ${channel} denied: sender is not the main renderer`);
        throw new IpcError(VALIDATION_ERROR_CODES.FORBIDDEN, `Sender not allowed for ${channel}`);
      }
      return invoke(channel, payload);
    });
  }

  backend.addDisposer('backend ipc', () => {
    for (const channel of BACKEND_REQUEST_CHANNELS) {
      ipcMain.removeHandler(channel);
    }
  });
}

/**
 * Publishes backend events to the main window, the only window that runs the
 * renderer. Never fans out to all webContents, which would include webview
 * guests. Events can fire from inside a sync loop, so a failed send only logs.
 */
export function createIpcEventPublisher(getMainWindow: GetMainWindow): BackendEventPublisher {
  return {
    emit(event, data) {
      const win = getMainWindow();
      if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return;
      try {
        win.webContents.send(event, data);
      } catch (error) {
        logger.warn(`Failed to publish ${event}`, error);
      }
    },
  };
}
