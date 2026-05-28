import { ipcRenderer, type IpcRendererEvent } from 'electron';

/**
 * Channels allowed for the generic `ipc.invokeWithTimeout` / `ipc.cancellableInvoke`
 * helpers. Each domain file contributes its own channels here so the renderer
 * cannot invoke handlers that weren't explicitly exposed.
 */
export const ALLOWED_IPC_CHANNELS: ReadonlySet<string> = new Set([
  // window
  'window:is-maximized',
  'window:open-devtools',
  // store
  'store:get',
  'store:set',
  'store:delete',
  'store:clear',
  // app / diagnostics
  'app:get-version',
  'app:get-system-info',
  'app:get-backend-port',
  'app:get-path',
  'app:clipboard-write',
  'app:clipboard-write-image',
  'app:save-file-binary',
  'app:fetch-image-base64',
  'app:open-logs-folder',
  'app:list-log-files',
  'app:read-log-file',
  'app:log-write',
  'app:set-log-level',
  'app:get-auto-launch',
  'app:set-auto-launch',
  'app:relaunch',
  'app:clear-user-files',
  // dialog
  'dialog:open-directory',
  'dialog:open-file',
  'dialog:save-file',
  'dialog:message',
  // file
  'file:write-json',
  'file:read-json',
  // background
  'background:pick',
  'background:remove',
  'background:get-url',
  // browser
  'browser:toggle-adblock',
  'browser:set-fullscreen',
  'browser:get-popup-block-enabled',
  'browser:set-popup-block-enabled',
  'browser:set-adblock-whitelist',
  'browser:clear-session',
  // updater
  'updater:check-for-updates',
  'updater:start-download',
  'updater:install-now',
  'updater:get-channel',
  'updater:set-channel',
  // notifications
  'notifications:get-settings',
  'notifications:update-settings',
  'notifications:get-subscriptions',
  'notifications:add-subscription',
  'notifications:remove-subscription',
  'notifications:toggle-subscription',
  'notifications:is-subscribed',
  // discord rpc
  'discord-rpc:get-settings',
  'discord-rpc:update-settings',
  'discord-rpc:update-presence',
  'discord-rpc:clear-presence',
  // app stats (local time-spent tracking)
  'app-stats:get-snapshot',
  'app-stats:set-watching-anime',
  'app-stats:reset',
  // overlay
  'overlay:show',
  'overlay:hide',
  'overlay:toggle',
  'overlay:get-status',
  'overlay:set-enabled',
  'overlay:is-enabled',
  'overlay:set-size',
  'overlay:get-size',
  'overlay:set-visibility-mode',
  'overlay:get-visibility-mode',
  'overlay:set-position-locked',
  'overlay:get-position-locked',
  'overlay:reset-position',
  'overlay:set-animation-enabled',
  'overlay:get-animation-enabled',
  'overlay:pick-sprite',
  'overlay:remove-sprite',
  'overlay:get-sprite-url',
  'overlay:set-sprite-scale',
  'overlay:get-sprite-scale',
]);

export function assertAllowedChannel(channel: string): void {
  if (!ALLOWED_IPC_CHANNELS.has(channel)) {
    throw new Error(`IPC channel not allowed: "${channel}"`);
  }
}

/**
 * Create a typed IPC listener that returns an unsubscribe function.
 * Eliminates the repeated on/removeListener boilerplate at each call site.
 */
export function createIpcListener<T>(channel: string): (callback: (data: T) => void) => () => void {
  return (callback: (data: T) => void) => {
    const handler = (_event: IpcRendererEvent, data: T) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  };
}

/**
 * IPC invoke with timeout.
 * Races ipcRenderer.invoke against a timer so the renderer never hangs
 * if the main process fails to respond. Restricted to allowed channels.
 */
export function invokeWithTimeout<T>(
  channel: string,
  timeout: number,
  ...args: unknown[]
): Promise<T> {
  assertAllowedChannel(channel);
  const invokePromise = ipcRenderer.invoke(channel, ...args) as Promise<T>;
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`IPC timeout: "${channel}" did not respond within ${timeout}ms`));
      // Swallow any late rejection to prevent unhandled promise rejection
      invokePromise.catch(() => {});
    }, timeout);
    if (typeof timer === 'object' && 'unref' in timer) {
      timer.unref();
    }
  });
  return Promise.race([invokePromise.finally(() => clearTimeout(timer)), timeoutPromise]);
}

/**
 * Cancellable IPC invoke.
 * Returns a handle with `promise` and `cancel()`. Calling `cancel()` rejects
 * the promise with a cancellation error. Restricted to allowed channels.
 */
export function cancellableInvoke<T>(
  channel: string,
  ...args: unknown[]
): { promise: Promise<T>; cancel: () => void } {
  assertAllowedChannel(channel);
  let settled = false;
  let rejectFn: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    rejectFn = reject;
    ipcRenderer
      .invoke(channel, ...args)
      .then((result: T) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      })
      .catch((error: unknown) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
  });
  const cancel = () => {
    if (settled) return;
    settled = true;
    rejectFn?.(new Error(`IPC request cancelled: "${channel}"`));
  };
  return { promise, cancel };
}
