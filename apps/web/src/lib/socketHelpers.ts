import { getSocket, connectSocket } from './socket';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('SocketHelper');

/**
 * Default timeout for socket operations (in milliseconds)
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Options for emit operations
 */
interface EmitOptions {
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Whether to auto-connect if not connected (default: true) */
  autoConnect?: boolean;
}

/**
 * Response type that includes an optional error field
 */
type ErrorResponse = { error: string };

/**
 * Ensure socket is connected before making requests
 */
async function ensureConnected(): Promise<void> {
  if (!getSocket().connected) {
    await connectSocket();
  }
}

/**
 * Generic emit with callback and timeout.
 * This is the lowest-level helper that simply wraps socket.emit with Promise and timeout.
 *
 * @param event - The socket event name to emit
 * @param payload - The payload to send with the event
 * @param options - Optional configuration (timeout, autoConnect)
 * @returns Promise that resolves with the response or rejects on timeout
 */
export async function emitAsync<TPayload, TResponse>(
  event: string,
  payload: TPayload,
  options: EmitOptions = {}
): Promise<TResponse> {
  const { timeout = DEFAULT_TIMEOUT, autoConnect = true } = options;

  if (autoConnect) {
    await ensureConnected();
  }

  logger.debug('Emitting', event);

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      logger.error('Request timed out:', event, `(${timeout}ms)`);
      reject(new Error(`Socket request '${event}' timed out after ${timeout}ms`));
    }, timeout);

    getSocket().emit(event, payload, (response: TResponse) => {
      clearTimeout(timeoutId);
      resolve(response);
    });
  });
}

/**
 * Emit that handles { error?: string } response pattern.
 * Automatically rejects if the response contains an 'error' field.
 *
 * @param event - The socket event name to emit
 * @param payload - The payload to send with the event
 * @param options - Optional configuration (timeout, autoConnect)
 * @returns Promise that resolves with the successful response or rejects with error
 */
export async function emitWithErrorHandling<TPayload, TResponse>(
  event: string,
  payload: TPayload,
  options: EmitOptions = {}
): Promise<TResponse> {
  const response = await emitAsync<TPayload, TResponse | ErrorResponse>(event, payload, options);

  if (response && typeof response === 'object' && 'error' in response) {
    logger.warn('Error response for', event, (response as ErrorResponse).error);
    throw new Error((response as ErrorResponse).error);
  }

  return response as TResponse;
}

export type { EmitOptions, ErrorResponse };
