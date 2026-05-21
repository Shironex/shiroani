import { ipcMain } from 'electron';
import type { ZodType } from 'zod';
import { createMainLogger } from '../logging/logger';
import { IpcError, VALIDATION_ERROR_CODES } from './errors';

const logger = createMainLogger('IPC');

type InvokeHandler<Args extends unknown[], R> = (
  event: Electron.IpcMainInvokeEvent,
  ...args: Args
) => Promise<R> | R;

type OnHandler<Args extends unknown[]> = (event: Electron.IpcMainEvent, ...args: Args) => void;

export interface HandleOptions<Args extends unknown[]> {
  schema?: ZodType<Args>;
}

function validateOrThrow<Args extends unknown[]>(
  channel: string,
  schema: ZodType<Args>,
  rawArgs: unknown[]
): Args {
  const parsed = schema.safeParse(rawArgs);
  if (!parsed.success) {
    logger.error(`[ipc:${channel}] validation failed`, parsed.error.issues);
    throw new IpcError(
      VALIDATION_ERROR_CODES.BAD_REQUEST,
      `Invalid payload for ${channel}`,
      parsed.error.issues
    );
  }
  return parsed.data;
}

/**
 * Registers an ipcMain handler that logs errors with a [ipc:<channel>] prefix and rethrows.
 * Eliminates try/catch/log/rethrow boilerplate from individual handlers.
 * Pass { schema } (a z.tuple([...])) to validate renderer payload before the handler runs.
 */
export function handle<Args extends unknown[], R>(
  channel: string,
  handler: InvokeHandler<Args, R>,
  options?: HandleOptions<Args>
): void {
  const schema = options?.schema;
  ipcMain.handle(channel, async (event, ...args) => {
    const parsedArgs = schema ? validateOrThrow(channel, schema, args) : (args as Args);
    try {
      return await handler(event, ...parsedArgs);
    } catch (err) {
      logger.error(`[ipc:${channel}]`, err);
      throw err;
    }
  });
}

/**
 * Like handle(), but calls fallback(err) instead of rethrowing when the handler errors.
 * Use for channels that return a degraded default on failure (e.g. getters that should
 * never crash the renderer).
 * Validation errors (BAD_REQUEST) bypass fallback and rethrow directly.
 */
export function handleWithFallback<Args extends unknown[], R>(
  channel: string,
  handler: InvokeHandler<Args, R>,
  fallback: (err: unknown) => R,
  options?: HandleOptions<Args>
): void {
  const schema = options?.schema;
  ipcMain.handle(channel, async (event, ...args) => {
    let parsedArgs: Args;
    if (schema) {
      parsedArgs = validateOrThrow(channel, schema, args);
    } else {
      parsedArgs = args as Args;
    }
    try {
      return await handler(event, ...parsedArgs);
    } catch (err) {
      logger.warn(`[ipc:${channel}] using fallback`, err);
      return fallback(err);
    }
  });
}

/**
 * Registers a fire-and-forget ipcMain.on handler with optional Zod validation.
 * Errors are logged but never thrown back to the renderer.
 */
export function on<Args extends unknown[]>(
  channel: string,
  handler: OnHandler<Args>,
  options?: HandleOptions<Args>
): void {
  const schema = options?.schema;
  ipcMain.on(channel, (event, ...args) => {
    try {
      const parsedArgs = schema ? validateOrThrow(channel, schema, args) : (args as Args);
      handler(event, ...parsedArgs);
    } catch (err) {
      logger.error(`[ipc:${channel}]`, err);
    }
  });
}
