import { createLogger } from '@shiroani/shared';

const logger = createLogger('Backend');

/** How long a call waits by default. The timer only stops the wait. */
export const DEFAULT_TIMEOUT = 10_000;

/** The bridge with its per-channel types erased: callers here pass runtime strings. */
type UntypedInvoke = (channel: string, payload: unknown) => Promise<unknown>;
type UntypedOn = (event: string, callback: (data: never) => void) => () => void;

export interface BackendCallOptions {
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Call a backend channel over IPC. Rejects on timeout, when there is no bridge
 * and when the response carries an `error`. The timeout only stops the wait: work
 * already running in the backend carries on.
 */
export async function invokeBackend<TPayload, TResponse>(
  channel: string,
  payload: TPayload,
  options: BackendCallOptions = {}
): Promise<TResponse> {
  const bridge = window.electronAPI?.backend;
  if (!bridge) {
    throw new Error(`Backend bridge is not available for '${channel}'`);
  }
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

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
 * Subscribe to a backend event and return the unsubscribe function. With no bridge
 * (Storybook, tests) this does nothing.
 */
export function onBackendEvent<T>(event: string, callback: (data: T) => void): () => void {
  const bridge = window.electronAPI?.backend;
  if (!bridge) return () => {};
  return (bridge.on as unknown as UntypedOn)(event, callback as (data: never) => void);
}
