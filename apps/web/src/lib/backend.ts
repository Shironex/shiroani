import { BACKEND_EVENT_CHANNELS, BACKEND_REQUEST_CHANNELS, createLogger } from '@shiroani/shared';
import { getSocket } from './socket';
import { DEFAULT_TIMEOUT, emitWithErrorHandling, type EmitOptions } from './socketHelpers';

const logger = createLogger('Backend');

// The allow-lists are the routing switch. Moving a domain to IPC means adding its
// channels to them; nothing at the call sites changes.
const ipcRequests: ReadonlySet<string> = new Set(BACKEND_REQUEST_CHANNELS);
const ipcEvents: ReadonlySet<string> = new Set(BACKEND_EVENT_CHANNELS);

/** The bridge with its per-channel types erased: callers here route by runtime string. */
type UntypedInvoke = (channel: string, payload: unknown) => Promise<unknown>;
type UntypedOn = (event: string, callback: (data: never) => void) => () => void;

export type BackendCallOptions = Pick<EmitOptions, 'timeout'>;

async function invokeOverIpc<TResponse>(
  channel: string,
  payload: unknown,
  timeout: number
): Promise<TResponse> {
  const bridge = window.electronAPI?.backend;
  if (!bridge) {
    throw new Error(`Backend bridge is not available for '${channel}'`);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      logger.error('Request timed out:', channel, `(${timeout}ms)`);
      reject(new Error(`Backend request '${channel}' timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    const response = await Promise.race([
      (bridge.invoke as unknown as UntypedInvoke)(channel, payload),
      timedOut,
    ]);
    // Structured clone keeps `{ error: undefined }` keys, so the key's presence
    // says nothing: only a string counts as an error.
    const error = (response as { error?: unknown } | null | undefined)?.error;
    if (typeof error === 'string') {
      logger.warn('Error response for', channel, error);
      throw new Error(error);
    }
    return response as TResponse;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call a backend channel over whichever transport serves it. Rejects on timeout
 * and when the response carries an `error`. The timeout only stops the wait: work
 * already running in the backend carries on.
 */
export async function invokeBackend<TPayload, TResponse>(
  channel: string,
  payload: TPayload,
  options: BackendCallOptions = {}
): Promise<TResponse> {
  if (!ipcRequests.has(channel)) {
    return emitWithErrorHandling<TPayload, TResponse>(channel, payload, options);
  }
  return invokeOverIpc<TResponse>(channel, payload, options.timeout ?? DEFAULT_TIMEOUT);
}

/**
 * Subscribe to a backend event. An event listed for IPC subscribes on both
 * transports, since a domain's services can emit from either while it migrates.
 * Each emission goes out on one transport, so nothing is delivered twice.
 * Throws if the socket is not initialized yet.
 */
export function onBackendEvent<T>(event: string, callback: (data: T) => void): () => void {
  const socket = getSocket();
  socket.on(event, callback as (data: unknown) => void);

  // No bridge outside Electron (Storybook, tests): the IPC side is a no-op.
  const bridge = window.electronAPI?.backend;
  const unsubscribeIpc =
    bridge && ipcEvents.has(event)
      ? (bridge.on as unknown as UntypedOn)(event, callback as (data: never) => void)
      : undefined;

  return () => {
    socket.off(event, callback as (data: unknown) => void);
    unsubscribeIpc?.();
  };
}
