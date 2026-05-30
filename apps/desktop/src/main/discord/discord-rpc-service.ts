import { Client } from '@xhayper/discord-rpc';
import type { BrowserWindow } from 'electron';
import { DEFAULT_DISCORD_TEMPLATES } from '@shiroani/shared';
import type {
  DiscordRpcSettings,
  DiscordPresenceActivity,
  DiscordRpcStatus,
} from '@shiroani/shared';
import { store } from '../store';
import { buildPresence } from './discord-presence-builder';
import { createMainLogger } from '../logging/logger';
import { LruTtlCache } from '../../modules/kernel/lru-ttl-cache';

const logger = createMainLogger('DiscordRpcService');

const DISCORD_CLIENT_ID = '1481042476402872361';
const STORE_KEY = 'discord-rpc-settings';
const MIN_UPDATE_INTERVAL_MS = 15_000; // Discord rate limit: 1 update per 15s
const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS = 60_000;

const DEFAULT_SETTINGS: DiscordRpcSettings = {
  enabled: false,
  showAnimeDetails: true,
  showElapsedTime: true,
  useCustomTemplates: false,
  templates: DEFAULT_DISCORD_TEMPLATES,
};

let client: Client | null = null;
let isConnected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = RECONNECT_BASE_MS;
let lastUpdateTime = 0;
let pendingActivity: DiscordPresenceActivity | null = null;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let currentActivity: DiscordPresenceActivity | null = null;
let activityStartTime: Date | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let isIdle = false;
const IDLE_TIMEOUT_MS = 20_000;

const STATUS_CHANNEL = 'discord-rpc:status-changed';
let currentStatus: DiscordRpcStatus = 'disconnected';
let mainWindowRef: BrowserWindow | null = null;
let mainWindowClosedHandler: (() => void) | null = null;

/** Registered by bootstrap so the service can push status transitions to the renderer. */
export function setDiscordRpcWindow(window: BrowserWindow | null): void {
  // Detach any prior 'closed' listener so we don't leak handlers across calls.
  if (mainWindowRef && mainWindowClosedHandler && !mainWindowRef.isDestroyed()) {
    mainWindowRef.off('closed', mainWindowClosedHandler);
  }
  mainWindowClosedHandler = null;

  mainWindowRef = window;

  if (window) {
    // Drop the reference when the window is destroyed so we don't pin a dead
    // BrowserWindow in memory (Electron leak).
    const handler = (): void => {
      if (mainWindowRef === window) {
        mainWindowRef = null;
        mainWindowClosedHandler = null;
      }
    };
    mainWindowClosedHandler = handler;
    window.on('closed', handler);
  }
}

export function getDiscordRpcStatus(): DiscordRpcStatus {
  return currentStatus;
}

/** Update the tracked status and broadcast it to the renderer when it changes. */
function setStatus(status: DiscordRpcStatus): void {
  if (status === currentStatus) return;
  currentStatus = status;
  logger.debug(`Discord RPC status: ${status}`);
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send(STATUS_CHANNEL, status);
  }
}

function getSettings(): DiscordRpcSettings {
  const stored = store.get(STORE_KEY) as Partial<DiscordRpcSettings> | undefined;
  if (!stored) return { ...DEFAULT_SETTINGS, templates: { ...DEFAULT_DISCORD_TEMPLATES } };
  return {
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : DEFAULT_SETTINGS.enabled,
    showAnimeDetails:
      typeof stored.showAnimeDetails === 'boolean'
        ? stored.showAnimeDetails
        : DEFAULT_SETTINGS.showAnimeDetails,
    showElapsedTime:
      typeof stored.showElapsedTime === 'boolean'
        ? stored.showElapsedTime
        : DEFAULT_SETTINGS.showElapsedTime,
    useCustomTemplates:
      typeof stored.useCustomTemplates === 'boolean'
        ? stored.useCustomTemplates
        : DEFAULT_SETTINGS.useCustomTemplates,
    templates: stored.templates
      ? { ...DEFAULT_DISCORD_TEMPLATES, ...stored.templates }
      : { ...DEFAULT_DISCORD_TEMPLATES },
  };
}

function saveSettings(settings: DiscordRpcSettings): void {
  store.set(STORE_KEY, settings);
}

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function clearThrottleTimer(): void {
  if (throttleTimer) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
  }
}

function scheduleReconnect(): void {
  clearReconnectTimer();
  const settings = getSettings();
  if (!settings.enabled) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectClient();
  }, reconnectDelay);

  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
}

const COVER_PROBE_TIMEOUT_MS = 4_000;
// Per-URL reachability cache so we don't re-probe the network on every (15s-
// throttled) presence update. `true` = reachable, `false` = 404/timeout/invalid.
// Bounded LRU so unique cover URLs can't grow the map unboundedly over long
// sessions; entries also expire so transient failures get re-probed.
const coverProbeCache = new LruTtlCache<string, boolean>(200, 30 * 60 * 1000);

/** Only http(s) URLs can be a Discord large-image asset. */
function isValidCoverUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validate + probe the anime cover URL. Returns the URL when it is well-formed
 * and reachable, otherwise undefined so the presence builder falls back to the
 * known-good `shiroani` logo asset instead of a broken-image placeholder.
 */
async function resolveCoverUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  if (!isValidCoverUrl(url)) return undefined;

  const cached = coverProbeCache.get(url);
  if (cached !== undefined) return cached ? url : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COVER_PROBE_TIMEOUT_MS);
  let ok = false;
  try {
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    // Some CDNs reject HEAD with 403/405 even when the image is valid via GET.
    // Fall back to a GET (still timeout-bounded) before treating it as unreachable.
    if (!res.ok && (res.status === 403 || res.status === 405)) {
      res = await fetch(url, { method: 'GET', signal: controller.signal });
    }
    ok = res.ok;
  } catch {
    // Unreachable/timeout — `ok` stays false and the cover is stripped.
  } finally {
    clearTimeout(timer);
  }

  coverProbeCache.set(url, ok);
  return ok ? url : undefined;
}

async function sendPresenceUpdate(activity: DiscordPresenceActivity): Promise<void> {
  if (!client || !isConnected) return;

  const settings = getSettings();
  // Guard the cover art: strip an unreachable URL so the builder's logo
  // fallback applies. Keeps buildPresence pure/synchronous.
  const safeCoverUrl = await resolveCoverUrl(activity.animeCoverUrl);
  const safeActivity: DiscordPresenceActivity =
    safeCoverUrl === activity.animeCoverUrl
      ? activity
      : { ...activity, animeCoverUrl: safeCoverUrl };
  const presence = buildPresence(safeActivity, settings, activityStartTime);

  try {
    await client.user?.setActivity(presence as never);
    lastUpdateTime = Date.now();
  } catch (error) {
    logger.error('Failed to set Discord presence:', error);
  }
}

function throttledUpdate(activity: DiscordPresenceActivity): void {
  const now = Date.now();
  const elapsed = now - lastUpdateTime;

  if (elapsed >= MIN_UPDATE_INTERVAL_MS) {
    sendPresenceUpdate(activity).catch(() => {});
    pendingActivity = null;
  } else {
    pendingActivity = activity;
    if (!throttleTimer) {
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (pendingActivity) {
          sendPresenceUpdate(pendingActivity).catch(() => {});
          pendingActivity = null;
        }
      }, MIN_UPDATE_INTERVAL_MS - elapsed);
    }
  }
}

let connectPromise: Promise<void> | null = null;

async function connectClient(): Promise<void> {
  if (connectPromise) return connectPromise;
  connectPromise = doConnect().finally(() => {
    connectPromise = null;
  });
  return connectPromise;
}

async function doConnect(): Promise<void> {
  if (client) {
    try {
      client.destroy();
    } catch {
      // ignore cleanup errors
    }
    client = null;
    isConnected = false;
  }

  client = new Client({ clientId: DISCORD_CLIENT_ID });
  setStatus('connecting');

  client.on('ready', () => {
    isConnected = true;
    reconnectDelay = RECONNECT_BASE_MS;
    setStatus('connected');
    logger.info('Discord RPC connected');

    activityStartTime = new Date();
    if (currentActivity) {
      sendPresenceUpdate(currentActivity).catch(() => {});
    } else {
      sendPresenceUpdate({ view: 'browser' }).catch(() => {});
    }
  });

  client.on('disconnected', () => {
    isConnected = false;
    setStatus('disconnected');
    logger.info('Discord RPC disconnected');
    scheduleReconnect();
  });

  try {
    await client.login();
  } catch {
    logger.debug('Discord not available, scheduling reconnect');
    isConnected = false;
    setStatus('error');
    scheduleReconnect();
  }
}

async function disconnectClient(): Promise<void> {
  clearReconnectTimer();
  clearThrottleTimer();

  if (client) {
    try {
      await client.user?.clearActivity();
    } catch {
      // ignore
    }
    try {
      client.destroy();
    } catch {
      // ignore
    }
    client = null;
    isConnected = false;
  }
  setStatus('disconnected');
}

// ========================================
// Public API
// ========================================

export function initializeDiscordRpc(): void {
  const settings = getSettings();
  logger.info(`DiscordRpcService initialized (enabled: ${settings.enabled})`);

  if (settings.enabled) {
    connectClient();
  }
}

export function getDiscordRpcSettings(): DiscordRpcSettings {
  return getSettings();
}

export function updateDiscordRpcSettings(updates: Partial<DiscordRpcSettings>): DiscordRpcSettings {
  const current = getSettings();
  const next: DiscordRpcSettings = {
    enabled: updates.enabled ?? current.enabled,
    showAnimeDetails: updates.showAnimeDetails ?? current.showAnimeDetails,
    showElapsedTime: updates.showElapsedTime ?? current.showElapsedTime,
    useCustomTemplates: updates.useCustomTemplates ?? current.useCustomTemplates,
    templates: updates.templates
      ? { ...current.templates, ...updates.templates }
      : current.templates,
  };
  saveSettings(next);

  if (next.enabled && !isConnected) {
    reconnectDelay = RECONNECT_BASE_MS;
    connectClient();
  } else if (!next.enabled) {
    disconnectClient();
  } else if (isConnected && currentActivity) {
    // Settings changed while connected — re-send presence with new settings
    sendPresenceUpdate(currentActivity).catch(() => {});
  }

  logger.info(
    `Discord RPC settings updated: enabled=${next.enabled}, showAnimeDetails=${next.showAnimeDetails}, showElapsedTime=${next.showElapsedTime}`
  );
  return next;
}

export function updateDiscordPresence(activity: DiscordPresenceActivity): void {
  const settings = getSettings();
  if (!settings.enabled) return;

  // Keep activityStartTime from initial connection — represents total session time

  currentActivity = activity;
  throttledUpdate(activity);
}

export function clearDiscordPresence(): void {
  currentActivity = null;
  activityStartTime = null;

  if (client && isConnected) {
    try {
      client.user?.clearActivity();
    } catch (error) {
      logger.error('Failed to clear Discord presence:', error);
    }
  }
}

export function onWindowBlur(): void {
  const settings = getSettings();
  if (!settings.enabled || !isConnected) return;

  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    isIdle = true;
    sendPresenceUpdate({ view: 'idle' }).catch(() => {});
    logger.debug('Idle presence activated');
  }, IDLE_TIMEOUT_MS);
}

export function onWindowFocus(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  if (isIdle) {
    isIdle = false;
    if (currentActivity) {
      sendPresenceUpdate(currentActivity).catch(() => {});
      logger.debug('Restored presence from idle');
    }
  }
}

export function cleanupDiscordRpc(): void {
  if (idleTimer) clearTimeout(idleTimer);
  disconnectClient();
  currentActivity = null;
  activityStartTime = null;
  logger.info('DiscordRpcService cleaned up');
}
