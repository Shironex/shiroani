/**
 * Application Constants
 *
 * Centralized constants for the ShiroAni application.
 * Use these instead of hardcoding values throughout the codebase.
 */

// =============================================================================
// App Identity
// =============================================================================

/** Application name (display) */
export const APP_NAME = 'ShiroAni';

// =============================================================================
// Network
// =============================================================================

/** Localhost address */
export const LOCALHOST = '127.0.0.1';

/** Vite dev server port */
export const VITE_DEV_PORT = 15174;

// =============================================================================
// Links
// =============================================================================

/** GitHub repo owner */
export const GITHUB_REPO_OWNER = 'Shironex';

/** GitHub repo name */
export const GITHUB_REPO_NAME = 'shiroani';

/** GitHub releases page URL */
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;

/** GitHub releases API URL (for fetching latest release data) */
export const GITHUB_RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

/** Discord community invite URL */
export const DISCORD_INVITE_URL = 'https://discord.gg/M3ujRdUJpn';

/** Landing page URL */
export const LANDING_URL = 'https://shiroani.app';

/** Custom protocol URL for the new tab page */
export const NEW_TAB_URL = 'shiroani://newtab';

/** Check if a URL is the new tab page */
export const isNewTabUrl = (url: string) => url === NEW_TAB_URL;

// =============================================================================
// Browser / Adblock
// =============================================================================

/**
 * Maximum number of host entries allowed in the adblock whitelist. Enforced on
 * BOTH sides of the process boundary (renderer store + main-process IPC), so it
 * lives here as the single source of truth to prevent the two caps drifting.
 */
export const ADBLOCK_WHITELIST_MAX_ENTRIES = 500;

// =============================================================================
// Logging
// =============================================================================

/** Log file prefix */
export const LOG_FILE_PREFIX = 'shiroani';

/** Maximum log file size before rotation (10MB) */
export const LOG_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Maximum age of log files before cleanup (7 days in ms) */
export const LOG_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Maximum total bytes allowed across all log files in the logs directory.
 * When the age-based cleanup pass leaves the directory above this ceiling,
 * the oldest files (by mtime) are pruned until the total is at or below it.
 */
export const LOG_MAX_TOTAL_DIR_BYTES = 200 * 1024 * 1024;

/** Log flush interval in milliseconds */
export const LOG_FLUSH_INTERVAL_MS = 100;

/** Maximum buffered log entries before forced flush */
export const LOG_BUFFER_MAX_ENTRIES = 50;

/** Log cleanup interval (1 hour in ms) */
export const LOG_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/** Default in-memory ring buffer size for shared logger */
export const LOG_RING_BUFFER_DEFAULT = 200;

/** Minimum allowed ring buffer size (clamp floor) */
export const LOG_RING_BUFFER_MIN = 50;

/** Maximum allowed ring buffer size (clamp ceiling) */
export const LOG_RING_BUFFER_MAX = 5000;

/**
 * Keys whose values must be redacted from structured log output.
 * Match is case-insensitive against the last segment of a property path.
 */
export const LOG_REDACT_KEYS: readonly string[] = [
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'api_key',
  'apiKey',
  'apikey',
  'x-api-key',
  'password',
  'secret',
  'client_secret',
  'clientSecret',
  'private_key',
  'privateKey',
];

/** Placeholder substituted for redacted values */
export const LOG_REDACT_PLACEHOLDER = '[REDACTED]';
