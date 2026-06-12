import { ipcMain } from 'electron';
import {
  setMascotVisible,
  isMascotVisible,
  setMascotPosition,
  getMascotPosition,
  isMascotEnabled,
  setMascotEnabled,
  getMascotSize,
  setMascotSize,
  getMascotVisibilityMode,
  applyMascotVisibilityMode,
  isMascotPositionLocked,
  setMascotPositionLocked,
  resetMascotPosition,
  isMascotAnimationEnabled,
  setMascotAnimationEnabled,
  getMascotMode,
  applyMascotMode,
} from '../mascot/overlay';
import { z } from 'zod';
import { handleWithFallback } from './with-ipc-handler';
import {
  overlayShowSchema,
  overlayHideSchema,
  overlayToggleSchema,
  overlayGetStatusSchema,
  overlayIsEnabledSchema,
  overlayGetSizeSchema,
  overlayGetVisibilityModeSchema,
  overlayGetPositionLockedSchema,
  overlayResetPositionSchema,
  overlaySetPositionSchema,
  overlaySetEnabledSchema,
  overlaySetSizeSchema,
  overlaySetPositionLockedSchema,
  overlaySetAnimationEnabledSchema,
  overlayGetAnimationEnabledSchema,
  overlayGetModeSchema,
  overlaySetModeSchema,
} from './schemas';

/**
 * Permissive override for `overlay:set-visibility-mode`. The canonical schema
 * is a `z.enum(['always', 'tray-only'])`, but that routes validation failures
 * through the BAD_REQUEST rethrow path — which bypasses `handleWithFallback`'s
 * fallback. To preserve the legacy `{ success: false, error }` envelope for
 * invalid modes, we validate the shape permissively here and check the enum
 * inside the handler body.
 */
const overlaySetVisibilityModePermissiveSchema = z.tuple([z.unknown()]);

/** Shared envelope types for mutating overlay channels. */
type EnvelopeBase = { success: boolean; error?: string };
type VisibilityEnvelope = EnvelopeBase & { visible?: boolean };
type EnabledEnvelope = EnvelopeBase & { enabled?: boolean };
type SizeEnvelope = EnvelopeBase & { size?: number };
type LockedEnvelope = EnvelopeBase & { locked?: boolean };
type ModeEnvelope = EnvelopeBase & { mode?: string };
type AnimationEnabledEnvelope = EnvelopeBase & { enabled?: boolean };

/**
 * Unchanged contract: mutating channels return `{ success, ... }`. We lean on
 * `handleWithFallback` to transform any thrown error (including Zod
 * BAD_REQUEST for invalid modes) into the error envelope.
 *
 * NOTE: `handleWithFallback` rethrows BAD_REQUEST by default, but our renderer
 * never deliberately sends malformed payloads — a schema miss here is a
 * programmer error, and the renderer already handles thrown IPC errors. Keep
 * the envelope contract for semantic failures (e.g. overlay service throws).
 */

/**
 * Register overlay control IPC handlers.
 *
 * Channels:
 *   overlay:show          - Show the mascot overlay
 *   overlay:hide          - Hide the mascot overlay
 *   overlay:toggle        - Toggle mascot visibility
 *   overlay:set-position  - Move the mascot to (x, y)
 *   overlay:get-status    - Get current visibility and position
 */
export function registerOverlayHandlers(): void {
  handleWithFallback<[], EnvelopeBase>(
    'overlay:show',
    () => {
      setMascotVisible(true);
      return { success: true };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlayShowSchema }
  );

  handleWithFallback<[], EnvelopeBase>(
    'overlay:hide',
    () => {
      setMascotVisible(false);
      return { success: true };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlayHideSchema }
  );

  handleWithFallback<[], VisibilityEnvelope>(
    'overlay:toggle',
    () => {
      const visible = isMascotVisible();
      setMascotVisible(!visible);
      return { success: true, visible: !visible };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlayToggleSchema }
  );

  handleWithFallback<[number, number], EnvelopeBase>(
    'overlay:set-position',
    (_event, x, y) => {
      setMascotPosition(x, y);
      return { success: true };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlaySetPositionSchema }
  );

  handleWithFallback(
    'overlay:get-status',
    () => {
      const enabled = isMascotEnabled();
      const visible = isMascotVisible();
      const position = getMascotPosition();
      return { enabled, visible, ...position };
    },
    err => ({ enabled: false, visible: false, x: 0, y: 0, error: String(err) }),
    { schema: overlayGetStatusSchema }
  );

  handleWithFallback<[boolean], EnabledEnvelope>(
    'overlay:set-enabled',
    (_event, enabled) => {
      setMascotEnabled(enabled);
      return { success: true, enabled };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlaySetEnabledSchema }
  );

  handleWithFallback(
    'overlay:is-enabled',
    () => {
      return isMascotEnabled();
    },
    () => false,
    { schema: overlayIsEnabledSchema }
  );

  handleWithFallback<[number], SizeEnvelope>(
    'overlay:set-size',
    (_event, size) => {
      setMascotSize(size);
      return { success: true, size };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlaySetSizeSchema }
  );

  handleWithFallback(
    'overlay:get-size',
    () => {
      return getMascotSize();
    },
    () => 1,
    { schema: overlayGetSizeSchema }
  );

  handleWithFallback<[unknown], ModeEnvelope>(
    'overlay:set-visibility-mode',
    (_event, mode) => {
      if (mode !== 'always' && mode !== 'tray-only') {
        return { success: false, error: 'Invalid visibility mode' };
      }
      applyMascotVisibilityMode(mode);
      return { success: true, mode };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlaySetVisibilityModePermissiveSchema }
  );

  handleWithFallback(
    'overlay:get-visibility-mode',
    () => {
      return getMascotVisibilityMode();
    },
    () => 'always' as const,
    { schema: overlayGetVisibilityModeSchema }
  );

  handleWithFallback<[boolean], LockedEnvelope>(
    'overlay:set-position-locked',
    (_event, locked) => {
      setMascotPositionLocked(locked);
      return { success: true, locked };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlaySetPositionLockedSchema }
  );

  handleWithFallback(
    'overlay:get-position-locked',
    () => {
      return isMascotPositionLocked();
    },
    () => false,
    { schema: overlayGetPositionLockedSchema }
  );

  handleWithFallback<[boolean], AnimationEnabledEnvelope>(
    'overlay:set-animation-enabled',
    (_event, enabled) => {
      setMascotAnimationEnabled(enabled);
      return { success: true, enabled };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlaySetAnimationEnabledSchema }
  );

  handleWithFallback(
    'overlay:get-animation-enabled',
    () => isMascotAnimationEnabled(),
    () => true,
    { schema: overlayGetAnimationEnabledSchema }
  );

  handleWithFallback<[unknown], ModeEnvelope>(
    'overlay:set-mode',
    (_event, mode) => {
      if (mode !== 'static' && mode !== 'roam') {
        return { success: false, error: 'Invalid mascot mode' };
      }
      applyMascotMode(mode);
      return { success: true, mode };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlaySetModeSchema }
  );

  handleWithFallback(
    'overlay:get-mode',
    () => getMascotMode(),
    () => 'static' as const,
    { schema: overlayGetModeSchema }
  );

  handleWithFallback<[], EnvelopeBase>(
    'overlay:reset-position',
    () => {
      resetMascotPosition();
      return { success: true };
    },
    err => ({ success: false, error: String(err) }),
    { schema: overlayResetPositionSchema }
  );
}

/**
 * Clean up overlay IPC handlers.
 */
export function cleanupOverlayHandlers(): void {
  ipcMain.removeHandler('overlay:show');
  ipcMain.removeHandler('overlay:hide');
  ipcMain.removeHandler('overlay:toggle');
  ipcMain.removeHandler('overlay:set-position');
  ipcMain.removeHandler('overlay:get-status');
  ipcMain.removeHandler('overlay:set-enabled');
  ipcMain.removeHandler('overlay:is-enabled');
  ipcMain.removeHandler('overlay:set-size');
  ipcMain.removeHandler('overlay:get-size');
  ipcMain.removeHandler('overlay:set-visibility-mode');
  ipcMain.removeHandler('overlay:get-visibility-mode');
  ipcMain.removeHandler('overlay:set-position-locked');
  ipcMain.removeHandler('overlay:get-position-locked');
  ipcMain.removeHandler('overlay:reset-position');
  ipcMain.removeHandler('overlay:set-animation-enabled');
  ipcMain.removeHandler('overlay:get-animation-enabled');
  ipcMain.removeHandler('overlay:set-mode');
  ipcMain.removeHandler('overlay:get-mode');
}
