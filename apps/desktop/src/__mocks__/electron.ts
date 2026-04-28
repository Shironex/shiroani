import { EventEmitter } from 'events';

const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
const onListeners = new Map<string, Array<(event: unknown, ...args: unknown[]) => void>>();

export const ipcMain = {
  handle: jest.fn((channel: string, handler: (...a: unknown[]) => unknown) => {
    handlers.set(channel, handler as (event: unknown, ...args: unknown[]) => unknown);
  }),
  on: jest.fn((channel: string, handler: (...a: unknown[]) => void) => {
    const list = onListeners.get(channel) ?? [];
    list.push(handler as (event: unknown, ...args: unknown[]) => void);
    onListeners.set(channel, list);
  }),
  removeHandler: jest.fn((channel: string) => {
    handlers.delete(channel);
  }),
  removeAllListeners: jest.fn((channel: string) => {
    onListeners.delete(channel);
  }),
  __invoke: (channel: string, ...args: unknown[]) => handlers.get(channel)?.({}, ...args),
  __send: (channel: string, ...args: unknown[]) =>
    onListeners.get(channel)?.forEach(l => l({}, ...args)),
  __reset: () => {
    handlers.clear();
    onListeners.clear();
    jest.clearAllMocks();
  },
  __handlers: handlers,
};

export const ipcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  send: jest.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const contextBridgeState: { __exposed: Record<string, any> } = { __exposed: {} };
export const contextBridge = {
  exposeInMainWorld: jest.fn((key: string, api: unknown) => {
    contextBridgeState.__exposed[key] = api;
  }),
  __getExposed: (key: string) => contextBridgeState.__exposed[key],
  __reset: () => {
    contextBridgeState.__exposed = {};
  },
};

export const app = {
  getPath: jest.fn((_name: string) => '/tmp/shiroani-test'),
  getVersion: jest.fn(() => '1.0.0-test'),
  getName: jest.fn(() => 'ShiroAni-test'),
  getGPUFeatureStatus: jest.fn(() => ({})),
  isPackaged: false,
  setLoginItemSettings: jest.fn(),
  getLoginItemSettings: jest.fn(() => ({ openAtLogin: false })),
  exit: jest.fn(),
  quit: jest.fn(),
};

export class BrowserWindow extends EventEmitter {
  webContents = {
    send: jest.fn(),
    on: jest.fn(),
    getURL: jest.fn(() => 'file:///test/index.html'),
    isDevToolsOpened: jest.fn(() => false),
    openDevTools: jest.fn(),
    devToolsWebContents: null,
  };
  isMaximized = jest.fn(() => false);
  isDestroyed = jest.fn(() => false);
  minimize = jest.fn();
  maximize = jest.fn();
  unmaximize = jest.fn();
  close = jest.fn();
  setFullScreen = jest.fn();
  static getAllWindows = jest.fn(() => [] as BrowserWindow[]);
}

export const dialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageBox: jest.fn(),
};

export const shell = {
  openExternal: jest.fn(),
  openPath: jest.fn(),
};

export const clipboard = {
  writeText: jest.fn(),
  readText: jest.fn(() => ''),
  writeImage: jest.fn(),
};

export const nativeImage = {
  createFromPath: jest.fn(() => ({ isEmpty: () => true, toDataURL: () => '' })),
  createFromBuffer: jest.fn(() => ({ isEmpty: () => true })),
};

export const protocol = {
  handle: jest.fn(),
  unhandle: jest.fn(),
};

export const net = {
  fetch: jest.fn(),
};

export const session = {
  defaultSession: {
    webRequest: { onHeadersReceived: jest.fn() },
    setPermissionRequestHandler: jest.fn(),
    setPermissionCheckHandler: jest.fn(),
  },
};

export const Notification = jest.fn().mockImplementation(() => ({
  show: jest.fn(),
  on: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Notification as any).isSupported = jest.fn(() => true);

export const powerSaveBlocker = {
  start: jest.fn(() => 1),
  stop: jest.fn(),
  isStarted: jest.fn(() => false),
};

export const screen = {
  getPrimaryDisplay: jest.fn(() => ({
    workAreaSize: { width: 1920, height: 1080 },
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  })),
};

// ── webContents / webFrameMain mocks ─────────────────────────────────
// Tests can register fake WebContents instances via `webContents.__set(id, fake)`.

interface FakeWebContents {
  isDestroyed?: () => boolean;
  on: jest.Mock;
  off: jest.Mock;
  mainFrame?: {
    framesInSubtree?: Array<{
      detached: boolean;
      processId: number;
      routingId: number;
      url: string;
      executeJavaScript: jest.Mock;
    }>;
  };
}

const webContentsRegistry = new Map<number, FakeWebContents>();
export const webContents = {
  fromId: jest.fn((id: number) => webContentsRegistry.get(id) ?? null),
  __set: (id: number, fake: FakeWebContents) => {
    webContentsRegistry.set(id, fake);
  },
  __delete: (id: number) => {
    webContentsRegistry.delete(id);
  },
  __reset: () => {
    webContentsRegistry.clear();
  },
};

interface FakeFrame {
  detached: boolean;
  processId: number;
  routingId: number;
  url: string;
  executeJavaScript: jest.Mock;
}

const frameRegistry = new Map<string, FakeFrame>();
export const webFrameMain = {
  fromId: jest.fn((processId: number, routingId: number) => {
    return frameRegistry.get(`${processId}:${routingId}`) ?? null;
  }),
  __set: (processId: number, routingId: number, frame: FakeFrame) => {
    frameRegistry.set(`${processId}:${routingId}`, frame);
  },
  __delete: (processId: number, routingId: number) => {
    frameRegistry.delete(`${processId}:${routingId}`);
  },
  __reset: () => {
    frameRegistry.clear();
  },
};

const powerMonitorListeners = new Map<string, Array<() => void>>();
export const powerMonitor = {
  getSystemIdleState: jest.fn((_idleThresholdSeconds: number) => 'active' as const),
  getSystemIdleTime: jest.fn(() => 0),
  on: jest.fn((event: string, handler: () => void) => {
    const list = powerMonitorListeners.get(event) ?? [];
    list.push(handler);
    powerMonitorListeners.set(event, list);
  }),
  removeAllListeners: jest.fn((event?: string) => {
    if (event) powerMonitorListeners.delete(event);
    else powerMonitorListeners.clear();
  }),
  __emit: (event: string) => powerMonitorListeners.get(event)?.forEach(l => l()),
  __reset: () => {
    powerMonitorListeners.clear();
  },
};
