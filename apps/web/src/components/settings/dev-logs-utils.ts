import type { TFunction } from 'i18next';
import { LogLevel, type LogEntry } from '@shiroani/shared';

export type LogLevelName = 'error' | 'warn' | 'info' | 'debug';
export type SourceMode = 'buffer' | 'today' | 'archive';
export type LevelFilter = 'all' | LogLevelName;

export interface LogFileInfo {
  name: string;
  size: number;
  lastModified: number;
}

export const LEVEL_TO_NAME: Record<LogLevel, LogLevelName> = {
  [LogLevel.ERROR]: 'error',
  [LogLevel.WARN]: 'warn',
  [LogLevel.INFO]: 'info',
  [LogLevel.DEBUG]: 'debug',
};

/** Cap on entries kept in memory when loading a log file from disk. */
export const FILE_ENTRY_LIMIT = 2000;

export function isValidLevel(value: string): value is LogLevelName {
  return value === 'error' || value === 'warn' || value === 'info' || value === 'debug';
}

export function stringifyData(data: unknown): string {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

export function prettyPrintData(data: unknown): string {
  if (typeof data === 'string') {
    // If the string is itself JSON, pretty-print it.
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function formatLine(entry: LogEntry): string {
  const time = entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp;
  const level = entry.level.toUpperCase().padEnd(5);
  const base = `${time} ${level} [${entry.context}] ${entry.message}`;
  if (entry.data === undefined) return base;
  return `${base} ${stringifyData(entry.data)}`;
}

export function parseJsonlLogEntries(contents: string): LogEntry[] {
  const out: LogEntry[] = [];
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    try {
      const parsed = JSON.parse(line) as Partial<LogEntry>;
      if (
        typeof parsed?.timestamp === 'string' &&
        typeof parsed?.level === 'string' &&
        typeof parsed?.context === 'string' &&
        typeof parsed?.message === 'string' &&
        isValidLevel(parsed.level)
      ) {
        out.push(parsed as LogEntry);
      }
    } catch {
      // Skip malformed lines silently.
    }
  }
  return out;
}

/**
 * Predicate for the level + free-text filter pipeline. Returns true when an
 * entry should be visible given the active level filter and a normalized
 * (trimmed, lower-cased) search query.
 */
export function matchesFilter(entry: LogEntry, levelFilter: LevelFilter, query: string): boolean {
  if (levelFilter !== 'all' && entry.level !== levelFilter) return false;
  if (query.length === 0) return true;
  const haystack =
    entry.message.toLowerCase() +
    '\n' +
    entry.context.toLowerCase() +
    '\n' +
    (entry.data === undefined ? '' : stringifyData(entry.data).toLowerCase());
  return haystack.includes(query);
}

export function formatFileDate(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function formatDownloadStamp(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}${mi}`;
}

export function describeError(err: unknown, t: TFunction<'settings'>): string {
  if (err instanceof Error) return err.message || t('logs.unknownError');
  if (typeof err === 'string') return err;
  return t('logs.fileError');
}
