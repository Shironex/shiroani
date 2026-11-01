import { ipcRenderer } from 'electron';
// The subpath, not the package root: the root pulls in zod, which a sandboxed
// preload cannot load. The esbuild config enforces this.
import {
  BACKEND_EVENT_CHANNELS,
  BACKEND_REQUEST_CHANNELS,
} from '@shiroani/shared/backend-channels';
import type { BackendBridge } from '@shiroani/shared';
import { createIpcListener } from './_shared';

const requestChannels: ReadonlySet<string> = new Set(BACKEND_REQUEST_CHANNELS);
const eventChannels: ReadonlySet<string> = new Set(BACKEND_EVENT_CHANNELS);

export const backendApi: BackendBridge = {
  invoke: (channel, ...args) => {
    if (!requestChannels.has(channel)) {
      return Promise.reject(new Error(`Backend channel not allowed: "${channel}"`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (event, callback) => {
    if (!eventChannels.has(event)) {
      throw new Error(`Backend event not allowed: "${event}"`);
    }
    return createIpcListener<never>(event)(callback);
  },
};
