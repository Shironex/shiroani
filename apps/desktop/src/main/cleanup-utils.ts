interface Logger {
  warn(message: string, ...args: unknown[]): void;
}

/**
 * `render-process-gone` reasons that constitute a hard failure (logged at
 * error level). Everything else — `killed`, `clean-exit`, `abnormal-exit`,
 * `oom`-adjacent eviction — is a warn. Shared by the per-window and per-app
 * handlers so the severity classification can't drift between them.
 */
const HARD_CRASH_REASONS: ReadonlySet<string> = new Set([
  'crashed',
  'oom',
  'launch-failed',
  'integrity-failure',
]);

/** True when a `render-process-gone` reason should be logged as an error. */
export function isHardCrashReason(reason: string): boolean {
  return HARD_CRASH_REASONS.has(reason);
}

/**
 * Run a cleanup function with error handling. Catches and logs any errors
 * so that one failing cleanup step does not prevent the remaining steps.
 */
export async function safeCleanup(
  name: string,
  fn: () => void | Promise<void>,
  logger: Logger
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    logger.warn(`${name} cleanup failed during shutdown`, error);
  }
}
