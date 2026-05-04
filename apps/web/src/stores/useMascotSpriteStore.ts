// Components using mascot sprite state should import from this store
// (e.g., MascotPreview.tsx, MascotSection.tsx).
import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { createLogger, type MascotSpriteScaleMode } from '@shiroani/shared';
import { electronStoreGet, electronStoreSet, electronStoreDelete } from '@/lib/electron-store';

const logger = createLogger('MascotSpriteStore');

/**
 * Persisted mascot sprite settings stored in electron-store under
 * `'custom-mascot-sprite'`. The main process owns the on-disk file and the
 * live overlay; the renderer mirrors just enough to drive the Settings
 * preview without an extra round-trip on every render.
 */
interface MascotSpriteSettings {
  /** File name stored in `userData/mascot-sprites/` */
  fileName: string;
  /** Protocol URL for the sprite (`shiroani-mascot://sprites/<name>`) */
  url: string;
  /** Scale mode that the native overlay applies. Mirrors CSS object-fit. */
  scaleMode: MascotSpriteScaleMode;
}

/**
 * Mascot sprite store state
 */
interface MascotSpriteState {
  /** Custom sprite URL (protocol URL for the renderer preview) */
  customSpriteUrl: string | null;
  /** File name of the custom sprite (for persistence/removal) */
  customSpriteFileName: string | null;
  /** Active scale mode — applies to both the preview and the desktop overlay */
  scaleMode: MascotSpriteScaleMode;
  /** Whether the sprite has been hydrated from persistence */
  spriteLoaded: boolean;
}

/**
 * Mascot sprite store actions
 */
interface MascotSpriteActions {
  /** Pick and set a custom sprite via native file dialog. Live overlay updates main-side. */
  pickSprite: () => Promise<void>;
  /** Remove the current custom sprite — deletes the file from disk and resets to default. */
  removeSprite: () => Promise<void>;
  /** Set the scale mode + push it to the live overlay. */
  setScaleMode: (mode: MascotSpriteScaleMode) => Promise<void>;
  /** Restore sprite settings from electron-store on app startup. */
  restoreSprite: () => Promise<void>;
}

type MascotSpriteStore = MascotSpriteState & MascotSpriteActions;

const DEFAULT_SCALE_MODE: MascotSpriteScaleMode = 'contain';
const SPRITE_STORE_KEY = 'custom-mascot-sprite';

/**
 * Persist sprite settings to electron-store. `null` clears the key.
 */
async function persistSpriteSettings(settings: MascotSpriteSettings | null): Promise<void> {
  try {
    if (settings) {
      await electronStoreSet(SPRITE_STORE_KEY, settings);
    } else {
      await electronStoreDelete(SPRITE_STORE_KEY);
    }
  } catch (err) {
    logger.warn('Failed to persist mascot sprite settings:', err);
  }
}

/**
 * Mascot sprite store using Zustand
 */
export const useMascotSpriteStore = create<MascotSpriteStore>()(
  maybeDevtools(
    (set, get) => ({
      // Initial state
      customSpriteUrl: null,
      customSpriteFileName: null,
      scaleMode: DEFAULT_SCALE_MODE,
      spriteLoaded: false,

      // Actions
      pickSprite: async () => {
        logger.debug('pickSprite');
        try {
          const result = await window.electronAPI?.overlay?.pickSprite();
          if (!result) return; // User cancelled

          const { scaleMode } = get();

          set(
            {
              customSpriteUrl: result.url,
              customSpriteFileName: result.fileName,
            },
            undefined,
            'mascotSprite/pick'
          );

          // The main process already cleaned up the previous file, persisted
          // the new filename, and pushed the sprite to the live overlay.
          // The renderer just needs to remember the URL for its preview.
          await persistSpriteSettings({
            fileName: result.fileName,
            url: result.url,
            scaleMode,
          });
        } catch (err) {
          logger.error('Failed to pick custom sprite:', err);
          throw err;
        }
      },

      removeSprite: async () => {
        logger.debug('removeSprite');
        const state = get();

        if (state.customSpriteFileName) {
          try {
            await window.electronAPI?.overlay?.removeSprite(state.customSpriteFileName);
          } catch (err) {
            logger.warn('Failed to remove sprite file:', err);
          }
        }

        set(
          {
            customSpriteUrl: null,
            customSpriteFileName: null,
            scaleMode: DEFAULT_SCALE_MODE,
          },
          undefined,
          'mascotSprite/remove'
        );

        await persistSpriteSettings(null);
      },

      setScaleMode: async (mode: MascotSpriteScaleMode) => {
        logger.debug('setScaleMode', mode);
        const state = get();
        if (state.scaleMode === mode) return;

        set({ scaleMode: mode }, undefined, 'mascotSprite/setScaleMode');

        try {
          await window.electronAPI?.overlay?.setSpriteScale(mode);
        } catch (err) {
          logger.warn('Failed to push scale mode to overlay:', err);
        }

        if (state.customSpriteFileName && state.customSpriteUrl) {
          await persistSpriteSettings({
            fileName: state.customSpriteFileName,
            url: state.customSpriteUrl,
            scaleMode: mode,
          });
        }
      },

      restoreSprite: async () => {
        logger.debug('restoreSprite');
        try {
          const saved = await electronStoreGet<MascotSpriteSettings>(SPRITE_STORE_KEY);

          // Always trust the main process for the persisted scale mode — it's
          // the source of truth used by the native overlay. Even if the user
          // never set a custom sprite, the mode may still be persisted.
          const persistedScale =
            (await window.electronAPI?.overlay?.getSpriteScale().catch(() => null)) ??
            saved?.scaleMode ??
            DEFAULT_SCALE_MODE;

          if (!saved || !saved.fileName) {
            set(
              { scaleMode: persistedScale, spriteLoaded: true },
              undefined,
              'mascotSprite/restore:empty'
            );
            return;
          }

          // Verify the file still exists by resolving its URL.
          const url = await window.electronAPI?.overlay?.getSpriteUrl(saved.fileName);
          if (!url) {
            logger.info('Saved sprite file no longer exists, clearing settings');
            await persistSpriteSettings(null);
            set(
              { scaleMode: persistedScale, spriteLoaded: true },
              undefined,
              'mascotSprite/restore:missing'
            );
            return;
          }

          set(
            {
              customSpriteUrl: url,
              customSpriteFileName: saved.fileName,
              scaleMode: persistedScale,
              spriteLoaded: true,
            },
            undefined,
            'mascotSprite/restore:success'
          );
          logger.info('Mascot sprite restored successfully');
        } catch (err) {
          logger.warn('Failed to restore mascot sprite:', err);
          set({ spriteLoaded: true }, undefined, 'mascotSprite/restore:error');
        }
      },
    }),
    { name: 'mascotSprite' }
  )
);
