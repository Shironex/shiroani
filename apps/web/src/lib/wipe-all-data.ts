import { createLogger, ImportExportEvents } from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { IS_ELECTRON } from '@/lib/platform';

const logger = createLogger('WipeAllData');

interface ClearAllResponse {
  success: boolean;
}

/**
 * Generous timeout for the database wipe. `clearAllData()` runs a DELETE across
 * every table plus a VACUUM, which rewrites the whole file and can take many
 * seconds on a large library — well past the socket helper's 10s default. A
 * premature timeout would reject `wipeAllData` (aborting the rest) even though
 * the backend wipe already committed, leaving a half-reset app reporting failure.
 */
const CLEAR_ALL_TIMEOUT_MS = 120_000;

/**
 * Factory reset: erase every trace of local user data and return the app to a
 * fresh-install state. Backs the Settings → Data "Delete all data" card.
 *
 * Desktop (Electron) order — the DB wipe is abort-critical; everything after it
 * is best-effort, because the bulk of user content is already gone and a
 * failed cosmetic step must not block the relaunch:
 *   1. SQLite (library / diary / feed / watch history / bookmarks) via backend
 *   2. electron-store (all settings, theme, mascot, onboarding flag)
 *   3. built-in browser session (cookies / logins / cache)
 *   4. user-uploaded files (custom backgrounds, mascot sprites under userData)
 *   5. renderer localStorage + sessionStorage
 *   6. relaunch (fire-and-forget — app.exit(0) means the promise never resolves)
 *
 * Web build (no Electron, no backend, no userData): web storage IS the entire
 * dataset, so clearing it is abort-critical — a failure must surface, not
 * silently reload as if the reset succeeded.
 *
 * Clearing electron-store + localStorage also drops the `onboarding-completed`
 * flag, so the first-run wizard replays on next launch — no extra step needed.
 */
export async function wipeAllData(): Promise<void> {
  if (!IS_ELECTRON) {
    // Web build: localStorage/sessionStorage is the only data. Abort-critical —
    // let a failure throw so the dialog reaches its error state instead of
    // reloading with the data intact.
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
    return;
  }

  // 1. Backend database — abort the whole wipe if this fails. emitWithErrorHandling
  // rejects on transport/timeout errors, but the gateway *resolves* with
  // { success: false } on a handler exception (handleGatewayRequest catches and
  // returns the default result — it never throws), so the resolved flag must be
  // enforced too. Without this, a failed DB wipe would still clear local state
  // and relaunch, breaking the abort-critical contract.
  const dbWipe = await emitWithErrorHandling<Record<string, never>, ClearAllResponse>(
    ImportExportEvents.CLEAR_ALL,
    {},
    { timeout: CLEAR_ALL_TIMEOUT_MS }
  );
  if (!dbWipe?.success) {
    throw new Error('Database wipe did not complete successfully');
  }

  // 2–5. Local stores + on-disk assets. Best-effort: one failure must not block
  // the rest or the relaunch, since the bulk of user content (the DB) is gone.
  // requireBridge throws if a method is missing, so a preload regression
  // surfaces as a logged warning rather than a silent no-op.
  await runBestEffort('electron-store', () =>
    requireBridge('electronAPI.store.clear', window.electronAPI?.store?.clear)()
  );
  await runBestEffort('browser-session', () =>
    requireBridge('electronAPI.browser.clearSession', window.electronAPI?.browser?.clearSession)()
  );
  await runBestEffort('user-files', () =>
    requireBridge('electronAPI.app.clearUserFiles', window.electronAPI?.app?.clearUserFiles)()
  );
  runBestEffortSync('web-storage', () => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // 6. Restart into a clean boot. Fire-and-forget: app.relaunch() + app.exit(0)
  // kills the process, so the IPC promise never resolves — never await it. If the
  // bridge method is missing (preload regression), fall back to a reload so the
  // user is never stranded in a half-wiped app that never restarts.
  const relaunch = window.electronAPI?.app?.relaunch;
  if (relaunch) {
    void relaunch();
  } else {
    logger.warn('electronAPI.app.relaunch unavailable; falling back to window.location.reload()');
    window.location.reload();
  }
}

/**
 * Resolve a preload bridge method, throwing a labelled error when it is missing
 * so the best-effort wrapper logs the gap instead of silently skipping the step.
 */
function requireBridge<T>(name: string, method: T | undefined): T {
  if (!method) throw new Error(`${name} is unavailable`);
  return method;
}

async function runBestEffort(label: string, fn: () => Promise<void> | undefined): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.warn(`Failed to clear ${label} (continuing)`, err);
  }
}

function runBestEffortSync(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    logger.warn(`Failed to clear ${label} (continuing)`, err);
  }
}
