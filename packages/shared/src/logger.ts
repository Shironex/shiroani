/**
 * Universal logger for ShiroAni
 *
 * Works across all environments:
 * - Electron main process (with optional file transport)
 * - React frontend (browser console with CSS badges)
 * - NestJS services
 *
 * Environment Variables:
 * - LOG_LEVEL: error, warn, info, debug (default: info)
 * - LOG_COLORS: true/false (default: true in Node.js)
 * - LOG_TIMESTAMPS: true/false (default: false)
 * - LOG_BUFFER_MAX: positive integer, clamped to [50, 5000] (default: 200)
 */

import {
  LOG_RING_BUFFER_DEFAULT,
  LOG_RING_BUFFER_MIN,
  LOG_RING_BUFFER_MAX,
  LOG_REDACT_KEYS,
  LOG_REDACT_PLACEHOLDER,
} from './constants/app';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const LOG_LEVEL_NAMES: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

// ANSI color codes for terminal output
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Browser CSS styles for console output
const BROWSER_STYLES = {
  timestamp: 'color: #6b7280; font-size: 11px;',
  context: 'color: #3b82f6; font-weight: 600;',
  reset: 'color: inherit; font-weight: inherit;',
  levels: {
    ERROR:
      'background: #ef4444; color: white; font-weight: bold; padding: 1px 6px; border-radius: 3px;',
    WARN: 'background: #f59e0b; color: white; font-weight: bold; padding: 1px 6px; border-radius: 3px;',
    INFO: 'background: #3b82f6; color: white; font-weight: bold; padding: 1px 6px; border-radius: 3px;',
    DEBUG:
      'background: #8b5cf6; color: white; font-weight: bold; padding: 1px 6px; border-radius: 3px;',
  },
};

// Environment detection - check for browser window on globalThis
const isBrowser = typeof (globalThis as Record<string, unknown>).window !== 'undefined';

// Configuration state
let currentLogLevel: LogLevel = LogLevel.INFO;

// Get environment variable safely (works in both Node.js and browser)
function getEnvVar(name: string): string | undefined {
  if (isBrowser) return undefined;
  try {
    return process?.env?.[name];
  } catch {
    return undefined;
  }
}

// Initialize configuration from environment variables
// Colors enabled by default in Node.js, can be disabled with LOG_COLORS=false
const colorsEnabled = !isBrowser && getEnvVar('LOG_COLORS') !== 'false';
let timestampsEnabled = getEnvVar('LOG_TIMESTAMPS') === 'true';

// Initialize log level from environment variable
const envLogLevel = getEnvVar('LOG_LEVEL')?.toLowerCase();
if (envLogLevel && LOG_LEVEL_NAMES[envLogLevel] !== undefined) {
  currentLogLevel = LOG_LEVEL_NAMES[envLogLevel];
}

function resolveLogLevel(level: LogLevel | keyof typeof LogLevel | string): LogLevel | undefined {
  if (typeof level === 'number') {
    return level in LogLevel ? (level as LogLevel) : undefined;
  }
  const mapped = LOG_LEVEL_NAMES[String(level).toLowerCase()];
  return mapped;
}

/** Current numeric log level. */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Update the active log level at runtime. Accepts either the enum value or a
 * case-insensitive name ("debug", "info", "warn", "error"). Unknown strings
 * are rejected via a warn on the internal logger and the call is a no-op.
 */
export function setLogLevel(level: LogLevel | keyof typeof LogLevel | string): void {
  const resolved = resolveLogLevel(level);
  if (resolved === undefined) {
    internalLogger().warn(`setLogLevel: ignoring unknown level ${JSON.stringify(level)}`);
    return;
  }
  if (resolved === currentLogLevel) return;
  currentLogLevel = resolved;
}

/**
 * Format ISO timestamp
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format short time for browser (HH:mm:ss.SSS)
 */
function formatShortTime(): string {
  return new Date().toISOString().split('T')[1].slice(0, 12);
}

/**
 * Format a log line for Node.js terminal output
 */
function formatNodeLog(level: string, context: string, levelColor: string): string {
  const parts: string[] = [];

  if (timestampsEnabled) {
    parts.push(colorsEnabled ? `${ANSI.gray}${formatTimestamp()}${ANSI.reset}` : formatTimestamp());
  }

  const levelPadded = level.padEnd(5);
  parts.push(colorsEnabled ? `${levelColor}${levelPadded}${ANSI.reset}` : levelPadded);
  parts.push(colorsEnabled ? `${ANSI.blue}[${context}]${ANSI.reset}` : `[${context}]`);

  return parts.join(' ');
}

/**
 * Structured log entry for JSON file logging and the in-memory ring buffer.
 */
export interface LogEntry {
  timestamp: string; // ISO 8601
  level: 'error' | 'warn' | 'info' | 'debug';
  context: string; // Logger context name (e.g., "SessionService")
  message: string; // Primary message (first arg stringified)
  data?: unknown; // Additional args if any
  /** Stable per-process session identifier (set via setLoggerContext). */
  sessionId?: string;
  /** Application version at log time (set via setLoggerContext). */
  appVersion?: string;
  /** Process platform (set via setLoggerContext). */
  platform?: string;
  /** Per-operation correlation id. */
  correlationId?: string;
}

// ── Session context ───────────────────────────────────────────────
//
// Module-level metadata stamped onto every emitted LogEntry. Main and
// renderer run in different processes and each call setLoggerContext()
// from their bootstrap with a distinct sessionId.

export interface LoggerSessionContext {
  sessionId?: string;
  appVersion?: string;
  platform?: string;
}

const sessionContext: LoggerSessionContext = {};

/**
 * Shallow-merge `ctx` into the module-level session context. Only fields
 * explicitly provided are updated; pass `undefined` to clear a field.
 * Values appear on subsequent LogEntry emissions (buffer + file transport).
 */
export function setLoggerContext(ctx: Partial<LoggerSessionContext>): void {
  if (!ctx || typeof ctx !== 'object') return;
  if ('sessionId' in ctx) sessionContext.sessionId = ctx.sessionId;
  if ('appVersion' in ctx) sessionContext.appVersion = ctx.appVersion;
  if ('platform' in ctx) sessionContext.platform = ctx.platform;
}

/** Read-only snapshot of the current session context. */
export function getLoggerContext(): Readonly<LoggerSessionContext> {
  return { ...sessionContext };
}

/**
 * Generate a short (12-char) random hex id suitable for correlation or
 * per-process session identifiers. Prefers `crypto.randomUUID()` when the
 * runtime exposes it; otherwise falls back to `Math.random()`.
 */
export function makeCorrelationId(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const uuidFn = cryptoObj?.randomUUID;
  if (typeof uuidFn === 'function') {
    // UUID v4 has hyphens at positions 8,13,18,23 — strip them and take the
    // first 12 hex chars for a compact id.
    try {
      return uuidFn.call(cryptoObj).replace(/-/g, '').slice(0, 12);
    } catch {
      // fall through to Math.random() path
    }
  }
  return Math.random().toString(16).slice(2, 14).padEnd(12, '0');
}

/**
 * Merge session context + per-logger tags onto a base entry. The base
 * fields (level, context, timestamp, message, data) are authoritative and
 * cannot be overridden by tags. Fields that are undefined are omitted so
 * the JSONL output doesn't carry dead keys.
 */
function buildLogEntry(base: LogEntry, tags: Partial<LogEntry> | undefined): LogEntry {
  // Start from tags (which may carry correlationId), then merge session
  // context, then the authoritative base fields so they always win.
  const merged: LogEntry = { ...base };
  if (sessionContext.sessionId !== undefined) merged.sessionId = sessionContext.sessionId;
  if (sessionContext.appVersion !== undefined) merged.appVersion = sessionContext.appVersion;
  if (sessionContext.platform !== undefined) merged.platform = sessionContext.platform;
  if (tags) {
    if (tags.sessionId !== undefined) merged.sessionId = tags.sessionId;
    if (tags.appVersion !== undefined) merged.appVersion = tags.appVersion;
    if (tags.platform !== undefined) merged.platform = tags.platform;
    if (tags.correlationId !== undefined) merged.correlationId = tags.correlationId;
  }
  return merged;
}

// ── In-memory ring buffer ─────────────────────────────────────────
//
// Every log call is pushed into this fixed-size ring. Developer mode
// reads it to surface recent activity in the log viewer and the
// diagnostics clipboard snapshot, so users can include real context
// when reporting a bug from prod.

function resolveBufferMax(): number {
  const raw = getEnvVar('LOG_BUFFER_MAX');
  if (!raw) return LOG_RING_BUFFER_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return LOG_RING_BUFFER_DEFAULT;
  return Math.min(LOG_RING_BUFFER_MAX, Math.max(LOG_RING_BUFFER_MIN, parsed));
}

const LOG_BUFFER_MAX = resolveBufferMax();
const logBuffer: LogEntry[] = [];
type BufferListener = (entries: readonly LogEntry[]) => void;
const bufferListeners = new Set<BufferListener>();

const REDACT_KEY_SET = new Set(LOG_REDACT_KEYS.map(k => k.toLowerCase()));

// Path regexes for home-directory scrubbing. The Windows form uses a negated
// class on [^\\/] so the capture stops at either separator even when Node has
// normalized one side to forward slashes. All three are anchored on the
// literal prefix (C:\Users\, /Users/, /home/) to avoid matching arbitrary
// substrings that happen to contain a username-shaped segment.
const WIN_USER_PATH_RE = /([A-Za-z]:[\\/]Users[\\/])[^\\/]+([\\/])/gi;
const MAC_USER_PATH_RE = /(\/Users\/)[^/]+(\/)/g;
const LINUX_USER_PATH_RE = /(\/home\/)[^/]+(\/)/g;

// Starts at the first '?' after a URL scheme and consumes until fragment or
// end so query-string secrets (access_token, sig, etc.) never leak verbatim.
const URL_QUERY_RE = /^(https?:\/\/[^?#\s]*)\?[^#]*(.*)$/i;

const redactionEnabled = true;

function redactString(value: string): string {
  let out = value.replace(WIN_USER_PATH_RE, '$1<USER>$2');
  out = out.replace(MAC_USER_PATH_RE, '$1<USER>$2');
  out = out.replace(LINUX_USER_PATH_RE, '$1<USER>$2');
  const urlMatch = out.match(URL_QUERY_RE);
  if (urlMatch) {
    out = `${urlMatch[1]}?${LOG_REDACT_PLACEHOLDER}${urlMatch[2]}`;
  }
  return out;
}

function lastSegmentKey(key: string): string {
  const dot = key.lastIndexOf('.');
  return (dot >= 0 ? key.slice(dot + 1) : key).toLowerCase();
}

function redactWalk<T>(value: T, seen: WeakMap<object, unknown>): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value) as unknown as T;
  if (typeof value !== 'object') return value;
  if (value instanceof Error) return value;

  const asObject = value as unknown as object;
  const cached = seen.get(asObject);
  if (cached !== undefined) return cached as T;

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(asObject, out);
    for (let i = 0; i < value.length; i++) {
      out[i] = redactWalk(value[i], seen);
    }
    return out as unknown as T;
  }

  const out: Record<string, unknown> = {};
  seen.set(asObject, out);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEY_SET.has(lastSegmentKey(key))) {
      out[key] = LOG_REDACT_PLACEHOLDER;
      continue;
    }
    out[key] = redactWalk(child, seen);
  }
  return out as unknown as T;
}

/**
 * Return a deep clone of `value` with deny-listed keys masked, home-directory
 * paths scrubbed, and URL query strings redacted. Circular refs are preserved
 * via a WeakMap visited set.
 */
export function redactForLogs<T>(value: T): T {
  if (!redactionEnabled) return value;
  return redactWalk(value, new WeakMap());
}

function safeStringify(value: unknown): string {
  const target = redactionEnabled ? redactForLogs(value) : value;
  if (typeof target === 'string') return target;
  if (target instanceof Error) return target.stack ?? target.message;
  try {
    return JSON.stringify(target);
  } catch {
    return String(target);
  }
}

function pushToBuffer(
  level: LogEntry['level'],
  context: string,
  args: unknown[],
  tags?: Partial<LogEntry>
): void {
  const first = args.length > 0 ? args[0] : '';
  const base: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    context,
    message: safeStringify(first),
  };
  if (args.length > 1) {
    base.data = args.length === 2 ? safeStringify(args[1]) : args.slice(1).map(safeStringify);
  }
  const entry = buildLogEntry(base, tags);
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
  if (bufferListeners.size > 0) {
    const snapshot = logBuffer.slice();
    for (const listener of bufferListeners) listener(snapshot);
  }
}

/** Snapshot of the current log ring buffer (oldest → newest). */
export function getLogBuffer(): readonly LogEntry[] {
  return logBuffer.slice();
}

/** Subscribe to buffer updates. Returns an unsubscribe function. */
export function subscribeToLogBuffer(listener: BufferListener): () => void {
  bufferListeners.add(listener);
  return () => bufferListeners.delete(listener);
}

/** Clear the log ring buffer. Listeners are notified with an empty array. */
export function clearLogBuffer(): void {
  logBuffer.length = 0;
  for (const listener of bufferListeners) listener([]);
}

/**
 * Format a message for file logging as structured JSONL (one JSON object per line)
 */
function formatFileLog(
  level: string,
  context: string,
  args: unknown[],
  tags?: Partial<LogEntry>
): string {
  try {
    // Redact home-dir paths, URL query secrets, and deny-listed keys BEFORE the
    // value reaches disk. The in-memory buffer already redacts via
    // `safeStringify`; the rotated JSONL file is the artifact users attach to
    // bug reports, so it must get the same pass (covers the updater shim too).
    const firstArg = args.length > 0 ? redactForLogs(args[0]) : '';
    const message = typeof firstArg === 'string' ? firstArg : JSON.stringify(firstArg);
    const base: LogEntry = {
      timestamp: formatTimestamp(),
      level: level.toLowerCase() as LogEntry['level'],
      context,
      message,
    };
    if (args.length > 1) {
      base.data = args.length === 2 ? redactForLogs(args[1]) : redactForLogs(args.slice(1));
    }
    return JSON.stringify(buildLogEntry(base, tags)) + '\n';
  } catch {
    return (
      JSON.stringify(
        buildLogEntry(
          {
            timestamp: formatTimestamp(),
            level: level.toLowerCase() as LogEntry['level'],
            context,
            message: String(args),
          },
          tags
        )
      ) + '\n'
    );
  }
}

/**
 * Logger interface returned by createLogger
 */
export interface Logger {
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  /** Alias for info() - for NestJS Logger compatibility */
  log: (...args: unknown[]) => void;
}

/**
 * Options for creating a logger
 */
export interface LoggerOptions {
  /** Use stderr instead of stdout (for MCP servers where stdout is reserved) */
  useStderr?: boolean;
  /** Optional file transport function for writing logs to disk */
  fileTransport?: (message: string) => void;
}

/**
 * Internal logger factory.
 * Wires pushToBuffer + console + optional fileTransport against a single
 * `tags` bag that's merged into every emitted entry.
 */
function createLoggerInternal(
  context: string,
  options: LoggerOptions | undefined,
  tags: Partial<LogEntry> | undefined
): Logger {
  const useStderr = options?.useStderr ?? false;
  const fileTransport = options?.fileTransport;

  let instance: Logger;

  if (isBrowser) {
    // Browser implementation with CSS styling
    instance = {
      error: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.ERROR) {
          pushToBuffer('error', context, args, tags);
          console.error(
            `%cERROR%c %c${formatShortTime()}%c %c[${context}]%c`,
            BROWSER_STYLES.levels.ERROR,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.timestamp,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.context,
            BROWSER_STYLES.reset,
            ...args
          );
        }
      },

      warn: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.WARN) {
          pushToBuffer('warn', context, args, tags);
          console.warn(
            `%cWARN%c %c${formatShortTime()}%c %c[${context}]%c`,
            BROWSER_STYLES.levels.WARN,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.timestamp,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.context,
            BROWSER_STYLES.reset,
            ...args
          );
        }
      },

      info: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.INFO) {
          pushToBuffer('info', context, args, tags);
          console.log(
            `%cINFO%c %c${formatShortTime()}%c %c[${context}]%c`,
            BROWSER_STYLES.levels.INFO,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.timestamp,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.context,
            BROWSER_STYLES.reset,
            ...args
          );
        }
      },

      debug: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.DEBUG) {
          pushToBuffer('debug', context, args, tags);
          console.log(
            `%cDEBUG%c %c${formatShortTime()}%c %c[${context}]%c`,
            BROWSER_STYLES.levels.DEBUG,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.timestamp,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.context,
            BROWSER_STYLES.reset,
            ...args
          );
        }
      },

      log: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.INFO) {
          pushToBuffer('info', context, args, tags);
          console.log(
            `%cINFO%c %c${formatShortTime()}%c %c[${context}]%c`,
            BROWSER_STYLES.levels.INFO,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.timestamp,
            BROWSER_STYLES.reset,
            BROWSER_STYLES.context,
            BROWSER_STYLES.reset,
            ...args
          );
        }
      },
    };
  } else {
    // Node.js implementation with ANSI colors
    // Choose output function based on useStderr option
    const output = useStderr ? console.error : console.log;
    const errorOutput = console.error;

    instance = {
      error: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.ERROR) {
          pushToBuffer('error', context, args, tags);
          errorOutput(formatNodeLog('ERROR', context, ANSI.red), ...args);
          if (fileTransport) {
            fileTransport(formatFileLog('ERROR', context, args, tags));
          }
        }
      },

      warn: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.WARN) {
          pushToBuffer('warn', context, args, tags);
          output(formatNodeLog('WARN', context, ANSI.yellow), ...args);
          if (fileTransport) {
            fileTransport(formatFileLog('WARN', context, args, tags));
          }
        }
      },

      info: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.INFO) {
          pushToBuffer('info', context, args, tags);
          output(formatNodeLog('INFO', context, ANSI.cyan), ...args);
          if (fileTransport) {
            fileTransport(formatFileLog('INFO', context, args, tags));
          }
        }
      },

      debug: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.DEBUG) {
          pushToBuffer('debug', context, args, tags);
          output(formatNodeLog('DEBUG', context, ANSI.magenta), ...args);
          if (fileTransport) {
            fileTransport(formatFileLog('DEBUG', context, args, tags));
          }
        }
      },

      log: (...args: unknown[]): void => {
        if (currentLogLevel >= LogLevel.INFO) {
          pushToBuffer('info', context, args, tags);
          output(formatNodeLog('INFO', context, ANSI.cyan), ...args);
          if (fileTransport) {
            fileTransport(formatFileLog('INFO', context, args, tags));
          }
        }
      },
    };
  }

  return instance;
}

/**
 * Create a logger instance with a context prefix
 */
export function createLogger(context: string, options?: LoggerOptions): Logger {
  return createLoggerInternal(context, options, undefined);
}

/**
 * Enable or disable timestamps in output
 */
export function setTimestampsEnabled(enabled: boolean): void {
  timestampsEnabled = enabled;
}

let _internalLogger: Logger | null = null;
function internalLogger(): Logger {
  if (!_internalLogger) _internalLogger = createLogger('Logger');
  return _internalLogger;
}
