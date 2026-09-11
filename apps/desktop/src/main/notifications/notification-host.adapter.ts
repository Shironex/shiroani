import { Injectable } from '@nestjs/common';
import { Notification, BrowserWindow, nativeImage } from 'electron';
import https from 'https';
import {
  isPrivateHostLiteral,
  type AiringAnime,
  type NotificationSettings,
} from '@shiroani/shared';
import { NotificationHostPort } from '../../modules/notifications/notification-host.port';
import { resolveAnimeTitle, buildLocalizedNotificationBody } from './notification-strings';
import {
  scheduleToastsOnQuit,
  clearScheduledToasts,
  logWindowsToastDiagnostics,
} from './win-scheduled-notifications';
import { createMainLogger } from '../logging/logger';

const logger = createMainLogger('NotificationHostAdapter');

/**
 * Electron implementation of `NotificationHostPort`. The main-window reference
 * is injected at bootstrap via `setTargetWindow` so the adapter can route
 * notification clicks back to the renderer.
 */
@Injectable()
export class ElectronNotificationHost extends NotificationHostPort {
  private targetWindow: BrowserWindow | null = null;

  setTargetWindow(window: BrowserWindow | null): void {
    this.targetWindow = window;
  }

  /**
   * macOS is excluded until the project has an Apple Developer ID — see the
   * rationale on `NotificationHostPort.supportsNativeNotifications`.
   */
  supportsNativeNotifications(): boolean {
    return process.platform !== 'darwin';
  }

  async showAiringNotification(airing: AiringAnime, settings: NotificationSettings): Promise<void> {
    // Defence in depth: the service already skips its check loop when the host
    // reports no support, but never fetch an icon and build a Notification that
    // the OS would only reject.
    if (!this.supportsNativeNotifications()) return;

    const title = resolveAnimeTitle(airing.media);
    const minutesLeft = Math.round((airing.airingAt - Date.now() / 1000) / 60);
    const body = buildLocalizedNotificationBody(airing.episode, minutesLeft);

    let icon: Electron.NativeImage | undefined;
    const coverUrl = airing.media.coverImage.large || airing.media.coverImage.medium;
    if (coverUrl) {
      const img = await downloadImage(coverUrl);
      if (img) {
        icon = img;
      } else {
        logger.warn(`Failed to download notification icon for "${title}"`);
      }
    }

    const notification = new Notification({
      title,
      body,
      ...(icon ? { icon } : {}),
      silent: settings.useSystemSound === false,
    });

    notification.on('click', () => {
      logger.info(`Notification clicked: "${title}" Ep ${airing.episode}`);
      const win = this.targetWindow;
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.webContents.send('notifications:clicked', {
          mediaId: airing.media.id,
          episode: airing.episode,
        });
      } else {
        logger.warn('Notification clicked but main window is unavailable');
      }
    });

    // Electron 42 moved macOS to the UNNotification API, which only displays
    // notifications for a code-signed app; unsigned builds emit `failed` instead
    // of showing anything. Without this listener the failure is silent and the
    // "Notification shown" line below would still claim success.
    notification.on('failed', (_event, error) => {
      logger.error(
        `Notification failed: "${title}" Ep ${airing.episode}` +
          (process.platform === 'darwin'
            ? ' (on macOS this usually means the app bundle is not code-signed)'
            : ''),
        error
      );
    });

    notification.show();
    logger.info(`Notification shown: "${title}" Ep ${airing.episode} (in ${minutesLeft}min)`);
  }

  async scheduleToastsOnQuit(
    schedule: AiringAnime[],
    settings: NotificationSettings,
    notifyIds: Set<number>,
    sentKeys: Set<string>
  ): Promise<void> {
    if (process.platform !== 'win32') return;
    await scheduleToastsOnQuit(schedule, settings, notifyIds, sentKeys);
  }

  async clearScheduledToasts(): Promise<void> {
    if (process.platform !== 'win32') return;
    await clearScheduledToasts();
  }

  async logScheduledToastDiagnostics(): Promise<void> {
    if (process.platform !== 'win32') return;
    await logWindowsToastDiagnostics();
  }
}

/** Download an image from a URL and return a nativeImage. Only allows https: URLs. */
function downloadImage(url: string): Promise<Electron.NativeImage | null> {
  return new Promise(resolve => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return resolve(null);
    }

    if (parsed.protocol !== 'https:' || isPrivateHostLiteral(parsed.hostname)) {
      // Matches the SSRF guard on the app image proxy + article extractor; the
      // URL is AniList-sourced today, but keep the three fetchers consistent.
      return resolve(null);
    }

    const SIZE_LIMIT = 5 * 1024 * 1024;

    // Shared handle so the timeout callback and the response data handler can
    // each cancel the other without a circular const/let dependency.
    const handle: {
      req: ReturnType<typeof https.get> | null;
      timeout: ReturnType<typeof setTimeout> | null;
    } = {
      req: null,
      timeout: null,
    };

    const abort = (): void => {
      handle.req?.destroy();
      clearTimeout(handle.timeout ?? undefined);
      resolve(null);
    };

    handle.timeout = setTimeout(abort, 5000);

    handle.req = https
      .get(url, res => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          clearTimeout(handle.timeout ?? undefined);
          return resolve(null);
        }

        let totalBytes = 0;
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > SIZE_LIMIT) {
            abort();
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          clearTimeout(handle.timeout ?? undefined);
          try {
            const buffer = Buffer.concat(chunks);
            const image = nativeImage.createFromBuffer(buffer);
            resolve(image.isEmpty() ? null : image);
          } catch {
            resolve(null);
          }
        });
        res.on('error', () => {
          clearTimeout(handle.timeout ?? undefined);
          resolve(null);
        });
      })
      .on('error', () => {
        clearTimeout(handle.timeout ?? undefined);
        resolve(null);
      });
  });
}
