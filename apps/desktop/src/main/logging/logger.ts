import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import {
  LOG_FILE_PREFIX,
  LOG_MAX_FILE_SIZE,
  LOG_MAX_AGE_MS,
  LOG_MAX_TOTAL_DIR_BYTES,
  LOG_FLUSH_INTERVAL_MS,
  LOG_BUFFER_MAX_ENTRIES,
  LOG_CLEANUP_INTERVAL_MS,
  createLogger,
  LoggerOptions,
  setTimestampsEnabled,
} from '@shiroani/shared';

// ============================================================================
// State
// ============================================================================

let logsDir: string | null = null;
const buffer: string[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let isRotating = false;
let loggingFailed = false;
let loggingErrorNotified = false;

/** Optional callback invoked on the first logging error */
let onLoggingError: ((error: unknown) => void) | null = null;

/**
 * Set the callback for logging errors (one-time notification)
 */
export function setOnLoggingError(callback: (error: unknown) => void): void {
  onLoggingError = callback;
}

// ============================================================================
// Path helpers
// ============================================================================

/**
 * Get the logs directory path (userData/logs).
 * Creates the directory if it does not exist.
 */
export function getLogsDir(): string {
  if (!logsDir) {
    const userDataPath = app.getPath('userData');
    logsDir = path.join(userDataPath, 'logs');
  }
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

/**
 * Get the current log file path (date-based).
 */
export function getLogPath(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(getLogsDir(), `${LOG_FILE_PREFIX}-${date}.log`);
}

// ============================================================================
// Rotation
// ============================================================================

/**
 * Find the next available rotation number for a given base file. Considers
 * both `.log` and `.log.gz` rotated siblings so a fresh rotation never
 * collides with a previously-compressed one.
 */
async function getNextRotationNumber(dir: string, baseName: string): Promise<number> {
  const files = await fs.promises.readdir(dir);
  let max = 0;
  // Pattern: shiroani-YYYY-MM-DD.N.log or shiroani-YYYY-MM-DD.N.log.gz
  const pattern = new RegExp(`^${escapeRegex(baseName)}\\.(\\d+)\\.log(?:\\.gz)?$`);
  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rotate the current log file if it exceeds LOG_MAX_FILE_SIZE.
 *
 * Steps:
 *   1. Rename the active log to `<base>.N.log` so writes can resume on a fresh
 *      file immediately.
 *   2. Read the rotated file, gzip-compress in-memory, and write
 *      `<base>.N.log.gz` next to it.
 *   3. Delete the uncompressed `<base>.N.log` once the .gz is durable.
 *
 * If gzip fails for any reason we leave the rotated `.N.log` in place rather
 * than losing data, and emit a warn through the main logger. Rotation is
 * synchronous (sync zlib + sync FS) to preserve the existing flush ordering
 * invariants — the async wrapper just exists to match the call site signature.
 */
async function rotateIfNeeded(currentPath: string): Promise<void> {
  if (isRotating) return;
  isRotating = true;

  let rotatedPath: string | null = null;

  try {
    const stat = await fs.promises.stat(currentPath);
    if (stat.size < LOG_MAX_FILE_SIZE) return;

    const dir = path.dirname(currentPath);
    const ext = path.extname(currentPath); // .log
    const base = path.basename(currentPath, ext); // shiroani-YYYY-MM-DD
    const n = await getNextRotationNumber(dir, base);
    rotatedPath = path.join(dir, `${base}.${n}${ext}`);
    const gzPath = `${rotatedPath}.gz`;

    // Step 1: rename so the active file pointer is freed immediately.
    await fs.promises.rename(currentPath, rotatedPath);

    // Step 2 + 3: gzip + cleanup. Done sync to keep ordering consistent.
    try {
      const buffer = fs.readFileSync(rotatedPath);
      const compressed = zlib.gzipSync(buffer);
      fs.writeFileSync(gzPath, compressed);
      fs.unlinkSync(rotatedPath);
    } catch (gzipError) {
      // Gzip failed — leave the .N.log in place so no data is lost. Surface
      // the failure via the main logger (after-the-fact) so devs can spot it.
      try {
        // Best-effort cleanup of a half-written .gz so future rotations don't
        // see a corrupt sibling.
        if (fs.existsSync(gzPath)) fs.unlinkSync(gzPath);
      } catch {
        // ignore
      }
      // Defer the warn so we don't recurse into rotateIfNeeded via the file
      // transport while still inside this rotation pass.
      setImmediate(() => {
        try {
          createMainLogger('Logger').warn(
            `Log rotation gzip failed; leaving uncompressed file ${path.basename(rotatedPath ?? '')}`,
            gzipError
          );
        } catch {
          // Logger may itself have been the source of failure — ignore.
        }
      });
    }
  } catch (error) {
    // File may not exist yet (first write), that's fine
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      handleLoggingError(error);
    }
  } finally {
    isRotating = false;
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Returns true when `name` is a managed log file (`.log` or `.log.gz`) under
 * our prefix. Centralized so age-based and total-size cleanup agree on what
 * counts as a managed file.
 */
function isManagedLogFile(name: string): boolean {
  if (!name.startsWith(LOG_FILE_PREFIX)) return false;
  return name.endsWith('.log') || name.endsWith('.log.gz');
}

/**
 * Returns the basename of the currently-active (today's) log file. The file
 * itself may not exist yet on disk; this is the *path* the next write would
 * land in. Cleanup paths use it to refuse to delete the live target.
 */
function getActiveLogBasename(): string {
  return path.basename(getLogPath());
}

/**
 * Remove log files older than LOG_MAX_AGE_MS, then prune oldest files (by
 * mtime) if the total directory size still exceeds LOG_MAX_TOTAL_DIR_BYTES.
 * The active log file is never deleted by either pass.
 */
async function cleanupOldLogs(): Promise<void> {
  try {
    const dir = getLogsDir();
    const files = await fs.promises.readdir(dir);
    const now = Date.now();
    const activeName = getActiveLogBasename();

    // ── Pass 1: age-based prune ────────────────────────────────────
    for (const file of files) {
      if (!isManagedLogFile(file)) continue;
      if (file === activeName) continue;

      const filePath = path.join(dir, file);
      try {
        const stat = await fs.promises.stat(filePath);
        if (now - stat.mtimeMs > LOG_MAX_AGE_MS) {
          await fs.promises.unlink(filePath);
        }
      } catch {
        // Ignore individual file errors during cleanup
      }
    }

    // ── Pass 2: total-size ceiling ─────────────────────────────────
    // Re-list because pass 1 may have deleted entries.
    const remaining: { name: string; path: string; size: number; mtimeMs: number }[] = [];
    try {
      const after = await fs.promises.readdir(dir);
      for (const file of after) {
        if (!isManagedLogFile(file)) continue;
        const full = path.join(dir, file);
        try {
          const st = await fs.promises.stat(full);
          if (!st.isFile()) continue;
          remaining.push({ name: file, path: full, size: st.size, mtimeMs: st.mtimeMs });
        } catch {
          // ignore individual stat failures
        }
      }
    } catch {
      // If the second readdir fails, skip the size pass.
      return;
    }

    let total = 0;
    for (const f of remaining) total += f.size;
    if (total <= LOG_MAX_TOTAL_DIR_BYTES) return;

    const ceilingMb = (LOG_MAX_TOTAL_DIR_BYTES / (1024 * 1024)).toFixed(0);
    const totalMb = (total / (1024 * 1024)).toFixed(1);
    logger.warn(`cleanup: total log dir ${totalMb} MB exceeds ceiling ${ceilingMb} MB, pruning`);

    // Sort oldest-first by mtime, then walk forward deleting until under the
    // ceiling. Skip the active log no matter where it lands in the sort.
    remaining.sort((a, b) => a.mtimeMs - b.mtimeMs);
    let deleted = 0;
    for (const f of remaining) {
      if (total <= LOG_MAX_TOTAL_DIR_BYTES) break;
      if (f.name === activeName) continue;
      try {
        await fs.promises.unlink(f.path);
        total -= f.size;
        deleted += 1;
      } catch {
        // Ignore individual delete failures; continue with next oldest.
      }
    }

    const finalMb = (total / (1024 * 1024)).toFixed(1);
    logger.info(`cleanup: pruned ${deleted} file(s); final log dir size ${finalMb} MB`);
  } catch {
    // Ignore cleanup errors -- non-critical
  }
}

// ============================================================================
// Flush
// ============================================================================

/**
 * Flush buffered log entries to disk.
 */
async function doFlush(): Promise<void> {
  if (buffer.length === 0 || loggingFailed) return;

  const entries = buffer.splice(0);
  const logPath = getLogPath();

  try {
    await rotateIfNeeded(logPath);
    await fs.promises.appendFile(logPath, entries.join(''));
    handleLoggingSuccess();
  } catch (error) {
    // Re-queue entries on failure so they are not lost
    buffer.unshift(...entries);
    handleLoggingError(error);
  }
}

/**
 * Force an immediate flush of all buffered logs. Returns a promise
 * that resolves when the flush is complete. Useful for before-quit.
 */
export async function flushLogs(): Promise<void> {
  await doFlush();
}

/**
 * Synchronously drain the in-memory write buffer to disk.
 *
 * Intended for `uncaughtException` / `unhandledRejection` handlers and any
 * other path where the process may exit before the event loop runs another
 * tick. Uses `fs.appendFileSync` so the write completes before returning.
 *
 * Safe to call after `flushLogs()` or the async flush timer — if the buffer
 * is empty, this is a no-op. On failure, entries are re-queued so a later
 * async flush can retry.
 */
export function flushLogsSync(): void {
  if (buffer.length === 0 || loggingFailed) return;

  const entries = buffer.splice(0);
  let logPath: string;
  try {
    logPath = getLogPath();
  } catch (error) {
    // Re-queue and bail — the logs dir may not be resolvable in the
    // middle of a crash (e.g. app not yet ready).
    buffer.unshift(...entries);
    handleLoggingError(error);
    return;
  }

  try {
    fs.appendFileSync(logPath, entries.join(''));
    handleLoggingSuccess();
  } catch (error) {
    buffer.unshift(...entries);
    handleLoggingError(error);
  }
}

// ============================================================================
// Error handling
// ============================================================================

/**
 * Consecutive flush failures before the file transport latches off for the
 * session. A single transient ENOSPC/EPERM used to disable logging forever;
 * the periodic flush timer now retries, and only a persistent failure latches.
 */
const MAX_CONSECUTIVE_LOG_FAILURES = 5;
let consecutiveLogFailures = 0;

function handleLoggingError(error: unknown): void {
  consecutiveLogFailures++;
  if (!loggingErrorNotified) {
    loggingErrorNotified = true;
    if (onLoggingError) {
      try {
        onLoggingError(error);
      } catch {
        // Callback itself failed, ignore
      }
    }
    // Also log to console once
    console.error('[Logger] File logging failed:', error);
  }
  if (consecutiveLogFailures >= MAX_CONSECUTIVE_LOG_FAILURES) {
    loggingFailed = true;
    console.error(
      `[Logger] File logging disabled after ${consecutiveLogFailures} consecutive failures`
    );
  }
  // Cap the re-queued buffer while the disk is unwritable — drop the OLDEST
  // entries so the eventual recovery flush carries the most recent context.
  const cap = LOG_BUFFER_MAX_ENTRIES * 2;
  if (buffer.length > cap) {
    buffer.splice(0, buffer.length - cap);
  }
}

function handleLoggingSuccess(): void {
  consecutiveLogFailures = 0;
}

// ============================================================================
// File transport
// ============================================================================

/**
 * File transport function passed to createLogger.
 * Buffers messages and flushes periodically or when buffer is full.
 */
export const fileTransport = (message: string): void => {
  if (loggingFailed) return;

  buffer.push(message);

  // Force flush if buffer exceeds max entries
  if (buffer.length >= LOG_BUFFER_MAX_ENTRIES) {
    doFlush().catch(() => {
      // Error already handled in doFlush
    });
  }
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the file logging system.
 * Called automatically on module load -- sets up flush timer and cleanup.
 */
function initialize(): void {
  // Ensure logs directory exists
  try {
    getLogsDir();
  } catch (error) {
    handleLoggingError(error);
    return;
  }

  // Start periodic flush timer
  flushTimer = setInterval(() => {
    doFlush().catch(() => {
      // Error already handled in doFlush
    });
  }, LOG_FLUSH_INTERVAL_MS);

  // Run initial cleanup
  cleanupOldLogs();

  // Schedule periodic cleanup
  cleanupTimer = setInterval(() => {
    cleanupOldLogs();
  }, LOG_CLEANUP_INTERVAL_MS);

  // Unref timers so they don't prevent process exit
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref();
  }
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// Initialize on module load
initialize();

// ============================================================================
// Logger instance
// ============================================================================

// Enable timestamps for main process logs
setTimestampsEnabled(true);

const loggerOptions: LoggerOptions = {
  fileTransport,
};

/**
 * Create a logger for the main process that writes to both console and log file.
 * Use this instead of the shared `createLogger` in all desktop main-process code.
 */
export function createMainLogger(context: string) {
  return createLogger(context, loggerOptions);
}

/** Main process logger */
export const logger = createMainLogger('Main');

// ============================================================================
// electron-updater shim
// ============================================================================

/**
 * Minimal subset of `electron-updater`'s `AppUpdater` surface we need in order
 * to install a logger. Declaring this locally keeps `logger.ts` free of a
 * compile-time dependency on `electron-updater` (the caller, `updater.ts`,
 * owns that import).
 */
export interface UpdaterLoggerTarget {
  logger: {
    info(message?: unknown): void;
    warn(message?: unknown): void;
    error(message?: unknown): void;
    debug?(message: string): void;
  } | null;
}

/**
 * Install a logger shim on the given `electron-updater` instance so its
 * internal debug output is routed through `createMainLogger('AutoUpdater')`
 * and written to our log file from the first tick.
 *
 * The caller owns the `electron-updater` import; pass `autoUpdater` in.
 */
export function attachUpdaterLogger(target: UpdaterLoggerTarget): void {
  const updaterLogger = createMainLogger('AutoUpdater');
  target.logger = {
    info: (message?: unknown) => updaterLogger.info(message),
    warn: (message?: unknown) => updaterLogger.warn(message),
    error: (message?: unknown) => updaterLogger.error(message),
    debug: (message: string) => updaterLogger.debug(message),
  };
}

export default logger;
