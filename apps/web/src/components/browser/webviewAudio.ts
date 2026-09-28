/**
 * Renderer-side audible detection for a single <webview>.
 *
 * The webview tag has no `audio-state-changed` event (that one only exists on
 * the guest's main-process WebContents). It does emit `media-started-playing`
 * and `media-paused` per media player, and exposes `isCurrentlyAudible()`.
 * Media playing is not the same as sound (a muted autoplay video is silent,
 * and a page can unmute a playing video without a new event), so while any
 * player is playing, or the last check still heard sound, the monitor polls
 * `isCurrentlyAudible()` once per interval and reports changes. When nothing
 * is playing and the guest is silent, polling stops.
 *
 * The playing counter is best effort: a late `media-paused` from the previous
 * document can arrive after a navigation, and a player removed from the page
 * without pausing never reports. The counter is clamped at zero, and polling
 * also stops after `MAX_SILENT_POLLS` silent checks in a row even when the
 * counter still says something plays, so a leaked count never polls forever.
 */

/** Poll cadence while media is playing. Each poll is one sync IPC round trip. */
export const AUDIBLE_POLL_MS = 1000;

/**
 * Consecutive silent polls after which polling stops even though a player is
 * still counted as playing (one minute at the default cadence). A later
 * `media-started-playing` starts polling again.
 */
export const MAX_SILENT_POLLS = 60;

export interface IAudibleSource {
  isCurrentlyAudible: () => boolean;
}

export interface IAudibleMonitor {
  /** A media player in the guest started playing. */
  mediaStarted: () => void;
  /** A media player in the guest paused or ended. */
  mediaPaused: () => void;
  /** The guest loaded a new document: every previous player is gone. */
  documentChanged: () => void;
  /** Stop polling; reports silence if the pane was audible. */
  dispose: () => void;
}

export function createAudibleMonitor(
  source: IAudibleSource,
  onChange: (audible: boolean) => void,
  pollMs: number = AUDIBLE_POLL_MS,
  maxSilentPolls: number = MAX_SILENT_POLLS
): IAudibleMonitor {
  let playing = 0;
  let silentPolls = 0;
  let audible = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const report = (next: boolean) => {
    if (next === audible) return;
    audible = next;
    onChange(next);
  };

  const stopPolling = () => {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  };

  const check = () => {
    let now = false;
    try {
      now = source.isCurrentlyAudible();
    } catch {
      // Guest detached or not attached yet; treat as silent.
    }
    report(now);
    silentPolls = now ? 0 : silentPolls + 1;
    if (now) return;
    if (playing === 0) {
      stopPolling();
    } else if (silentPolls >= maxSilentPolls) {
      // The counter has most likely leaked (a player vanished without a
      // pause event); forget it rather than poll for the page's lifetime.
      playing = 0;
      stopPolling();
    }
  };

  const startPolling = () => {
    silentPolls = 0;
    if (timer !== null) return;
    timer = setInterval(check, pollMs);
  };

  return {
    mediaStarted: () => {
      playing++;
      startPolling();
    },
    mediaPaused: () => {
      playing = Math.max(0, playing - 1);
      startPolling();
    },
    documentChanged: () => {
      playing = 0;
      startPolling();
    },
    dispose: () => {
      stopPolling();
      playing = 0;
      report(false);
    },
  };
}
