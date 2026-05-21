/**
 * Format a byte count as a human-readable size with an adaptive unit:
 * `B` below 1 KiB, `KB` (1 decimal) below 1 MiB, otherwise `MB` (2 decimals).
 * Returns the em-dash sentinel `—` for non-finite or negative inputs.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
