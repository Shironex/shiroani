import { ipcMain, shell } from 'electron';
import { existsSync } from 'fs';
import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import { gunzipSync } from 'zlib';
import {
  LOG_FILE_PREFIX,
  LOG_MAX_FILE_SIZE,
  setLogLevel,
  getLogLevel,
  LogLevel,
} from '@shiroani/shared';
import { getLogsDir, createMainLogger } from '../logging/logger';
import { handle, handleWithFallback } from './with-ipc-handler';
import {
  appOpenLogsFolderSchema,
  appListLogFilesSchema,
  appSetLogLevelSchema,
  appReadLogFileSchema,
} from './schemas';

const logger = createMainLogger('IPC:App');

// Dedicated forwarder logger — keeps renderer-originated entries visually
// distinct (and separable via the `Renderer:*` context) from main-process ones.
const rendererForwardLoggers = new Map<string, ReturnType<typeof createMainLogger>>();
function getRendererForwardLogger(subContext: string): ReturnType<typeof createMainLogger> {
  const tag = `Renderer:${subContext}`;
  let existing = rendererForwardLoggers.get(tag);
  if (!existing) {
    existing = createMainLogger(tag);
    rendererForwardLoggers.set(tag, existing);
  }
  return existing;
}

const ALLOWED_LOG_LEVELS = new Set(['error', 'warn', 'info', 'debug'] as const);
type AllowedLogLevel = 'error' | 'warn' | 'info' | 'debug';

// Clamp thresholds — prevent a runaway renderer from bloating the log file.
const RENDERER_LOG_MESSAGE_MAX = 16 * 1024; // 16 KB
const RENDERER_LOG_DATA_MAX = 32 * 1024; // 32 KB
const TRUNCATED_SUFFIX = '...[truncated]';

// ── app:log-write rate limiter ──────────────────────────────────────────
// Token bucket per renderer (keyed by `event.sender.id`). Renderers can burst
// up to LOG_WRITE_RATE_LIMIT entries per second; excess drops silently so a
// runaway renderer can't flood the on-disk log.
const LOG_WRITE_RATE_LIMIT = 100; // entries per window
const LOG_WRITE_WINDOW_MS = 1_000;
interface LogRateBucket {
  count: number;
  resetAt: number;
}
const logRateBuckets = new Map<number, LogRateBucket>();

function shouldAcceptLogWrite(senderId: number): boolean {
  const now = Date.now();
  const bucket = logRateBuckets.get(senderId);
  if (!bucket || now >= bucket.resetAt) {
    logRateBuckets.set(senderId, { count: 1, resetAt: now + LOG_WRITE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= LOG_WRITE_RATE_LIMIT) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function clampString(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, Math.max(0, max - TRUNCATED_SUFFIX.length)) + TRUNCATED_SUFFIX;
}

function clampSerializedData(data: unknown): unknown {
  if (data === undefined) return undefined;
  let serialized: string;
  try {
    serialized = typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    // Fall back to String() for non-serializable values (circular refs, BigInt).
    serialized = String(data);
  }
  if (serialized.length <= RENDERER_LOG_DATA_MAX) return data;
  return clampString(serialized, RENDERER_LOG_DATA_MAX);
}

function logLevelName(level: LogLevel): AllowedLogLevel {
  switch (level) {
    case LogLevel.ERROR:
      return 'error';
    case LogLevel.WARN:
      return 'warn';
    case LogLevel.DEBUG:
      return 'debug';
    case LogLevel.INFO:
    default:
      return 'info';
  }
}

/**
 * Register log-related IPC handlers (open folder, list/read log files,
 * renderer log-write forwarding, runtime log-level control).
 */
export function registerAppLogHandlers(): void {
  handle(
    'app:open-logs-folder',
    async () => {
      logger.debug('app:open-logs-folder invoked');
      const logsPath = getLogsDir();
      await shell.openPath(logsPath);
    },
    { schema: appOpenLogsFolderSchema }
  );

  handleWithFallback(
    'app:list-log-files',
    async () => {
      logger.debug('app:list-log-files invoked');
      const logsDir = getLogsDir();
      if (!existsSync(logsDir)) return [];

      const entries = await readdir(logsDir);
      const logFiles: { name: string; size: number; lastModified: number }[] = [];

      for (const entry of entries) {
        if (!entry.startsWith(LOG_FILE_PREFIX)) continue;
        if (!entry.endsWith('.log') && !entry.endsWith('.log.gz')) continue;
        const fileStat = await stat(join(logsDir, entry));
        if (!fileStat.isFile()) continue;
        logFiles.push({
          name: entry,
          size: fileStat.size,
          lastModified: fileStat.mtimeMs,
        });
      }

      return logFiles.sort((a, b) => b.lastModified - a.lastModified);
    },
    () => [],
    { schema: appListLogFilesSchema }
  );

  // app:log-write — MUST never throw back to the renderer. We deliberately do
  // NOT attach a Zod schema here (BAD_REQUEST bypasses the fallback path);
  // instead we keep the original permissive shape check and silently drop
  // invalid payloads.
  handleWithFallback(
    'app:log-write',
    (event, payload: unknown) => {
      // Rate-limit per sender so a runaway renderer can't flood the log file.
      // `event.sender.id` is stable per webContents; the bucket self-resets each
      // LOG_WRITE_WINDOW_MS. In tests the mock passes `{}` as the event — guard
      // against a missing sender so the handler stays permissive there.
      const senderId: number | undefined = event?.sender?.id;
      if (typeof senderId === 'number' && !shouldAcceptLogWrite(senderId)) {
        return;
      }

      if (!payload || typeof payload !== 'object') return;
      const entry = payload as {
        level?: unknown;
        context?: unknown;
        message?: unknown;
        data?: unknown;
      };

      const rawLevel = typeof entry.level === 'string' ? entry.level.toLowerCase() : '';
      if (!ALLOWED_LOG_LEVELS.has(rawLevel as AllowedLogLevel)) return;
      const level = rawLevel as AllowedLogLevel;

      if (typeof entry.context !== 'string' || entry.context.length === 0) return;
      if (typeof entry.message !== 'string') return;

      const message = clampString(entry.message, RENDERER_LOG_MESSAGE_MAX);
      const forwardLogger = getRendererForwardLogger(entry.context);

      if (entry.data === undefined) {
        forwardLogger[level](message);
      } else {
        forwardLogger[level](message, clampSerializedData(entry.data));
      }
    },
    () => undefined
  );

  handleWithFallback(
    'app:set-log-level',
    (_event, payload) => {
      const requested = payload?.level;
      const rawLevel = typeof requested === 'string' ? requested.toLowerCase() : '';
      if (!ALLOWED_LOG_LEVELS.has(rawLevel as AllowedLogLevel)) {
        return { ok: false, level: logLevelName(getLogLevel()) };
      }
      setLogLevel(rawLevel);
      const current = logLevelName(getLogLevel());
      logger.debug(`app:set-log-level → ${current}`);
      return { ok: current === rawLevel, level: current };
    },
    () => ({ ok: false, level: logLevelName(getLogLevel()) }),
    { schema: appSetLogLevelSchema }
  );

  handle(
    'app:read-log-file',
    async (_event, fileName) => {
      logger.debug(`app:read-log-file invoked for "${fileName}"`);

      // Security: reject path traversal, null bytes, and invalid filenames.
      // Allowlist matches both `.log` and `.log.gz` rotated siblings.
      const isGzipped = fileName.endsWith('.log.gz');
      const hasValidSuffix = fileName.endsWith('.log') || isGzipped;
      if (
        fileName.includes('\0') ||
        fileName.includes('/') ||
        fileName.includes('\\') ||
        fileName.includes('..') ||
        !fileName.startsWith(LOG_FILE_PREFIX) ||
        !hasValidSuffix
      ) {
        throw new Error('Invalid log file name');
      }

      const filePath = join(getLogsDir(), fileName);

      // For uncompressed `.log`, enforce the cap against on-disk size before
      // reading. For `.log.gz`, the on-disk size is post-compression so we have
      // to decompress first; the cap is then applied to the decompressed length
      // and we truncate (with a trailing JSONL warn line) instead of rejecting.
      let fileStat: Awaited<ReturnType<typeof stat>>;
      try {
        fileStat = await stat(filePath);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          'code' in err &&
          (err as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          throw new Error('Log file not found', { cause: err });
        }
        throw err;
      }

      if (!isGzipped) {
        if (fileStat.size > LOG_MAX_FILE_SIZE) {
          throw new Error(`Log file exceeds ${LOG_MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
        }
        return readFile(filePath, 'utf-8');
      }

      // Compressed branch: gunzip, then enforce the cap on decompressed bytes.
      const compressed = await readFile(filePath);
      let decompressed: Buffer;
      try {
        decompressed = gunzipSync(compressed);
      } catch (err) {
        throw new Error('Failed to decompress log file', { cause: err });
      }

      if (decompressed.length <= LOG_MAX_FILE_SIZE) {
        return decompressed.toString('utf-8');
      }

      const truncationNotice =
        JSON.stringify({
          level: 'warn',
          context: 'LogFile',
          message: `truncated at ${LOG_MAX_FILE_SIZE} bytes`,
        }) + '\n';
      // Reserve room for the notice so the total payload stays under the cap.
      const noticeBytes = Buffer.byteLength(truncationNotice, 'utf-8');
      const sliceLen = Math.max(0, LOG_MAX_FILE_SIZE - noticeBytes);
      let head = decompressed.subarray(0, sliceLen).toString('utf-8');
      // Don't leave a partial JSONL line dangling — chop back to the last `\n`
      // so the caller still sees well-formed lines before the notice.
      const lastNewline = head.lastIndexOf('\n');
      if (lastNewline >= 0) head = head.slice(0, lastNewline + 1);
      return head + truncationNotice;
    },
    { schema: appReadLogFileSchema }
  );
}

/**
 * Clean up log-related IPC handlers.
 */
export function cleanupAppLogHandlers(): void {
  ipcMain.removeHandler('app:open-logs-folder');
  ipcMain.removeHandler('app:list-log-files');
  ipcMain.removeHandler('app:read-log-file');
  ipcMain.removeHandler('app:log-write');
  ipcMain.removeHandler('app:set-log-level');
}
