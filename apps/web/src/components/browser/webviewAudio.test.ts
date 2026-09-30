import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AUDIBLE_POLL_MS, createAudibleMonitor, MAX_SILENT_POLLS } from './webviewAudio';

describe('createAudibleMonitor', () => {
  let audibleNow: boolean;
  const source = { isCurrentlyAudible: vi.fn(() => audibleNow) };

  beforeEach(() => {
    vi.useFakeTimers();
    audibleNow = false;
    source.isCurrentlyAudible.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not poll before any media plays', () => {
    const onChange = vi.fn();
    createAudibleMonitor(source, onChange);
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 5);
    expect(source.isCurrentlyAudible).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports audible once playing media produces sound', () => {
    const onChange = vi.fn();
    const monitor = createAudibleMonitor(source, onChange);
    monitor.mediaStarted();
    audibleNow = true;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('keeps polling silent playing media, so a page unmuting it is picked up', () => {
    const onChange = vi.fn();
    const monitor = createAudibleMonitor(source, onChange);
    monitor.mediaStarted();
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 3);
    expect(onChange).not.toHaveBeenCalled();
    audibleNow = true;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reports each change once and silence after the media pauses, then stops polling', () => {
    const onChange = vi.fn();
    const monitor = createAudibleMonitor(source, onChange);
    monitor.mediaStarted();
    audibleNow = true;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 3);
    expect(onChange).toHaveBeenCalledTimes(1);

    monitor.mediaPaused();
    audibleNow = false;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(onChange).toHaveBeenCalledTimes(2);

    const calls = source.isCurrentlyAudible.mock.calls.length;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 5);
    expect(source.isCurrentlyAudible.mock.calls.length).toBe(calls);
  });

  it('keeps polling while another player is still playing', () => {
    const onChange = vi.fn();
    const monitor = createAudibleMonitor(source, onChange);
    monitor.mediaStarted();
    monitor.mediaStarted();
    monitor.mediaPaused();
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 2);
    const calls = source.isCurrentlyAudible.mock.calls.length;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 2);
    expect(source.isCurrentlyAudible.mock.calls.length).toBeGreaterThan(calls);
  });

  it('forgets players from the previous document on navigation', () => {
    const onChange = vi.fn();
    const monitor = createAudibleMonitor(source, onChange);
    monitor.mediaStarted();
    audibleNow = true;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    monitor.documentChanged();
    audibleNow = false;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    expect(onChange).toHaveBeenLastCalledWith(false);
    const calls = source.isCurrentlyAudible.mock.calls.length;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 3);
    expect(source.isCurrentlyAudible.mock.calls.length).toBe(calls);
  });

  it('clamps a late pause from the previous document at zero', () => {
    const onChange = vi.fn();
    const monitor = createAudibleMonitor(source, onChange);
    monitor.mediaStarted();
    monitor.documentChanged();
    // The old document's player reports its pause after the navigation.
    monitor.mediaPaused();
    // One player in the new document: the count must be 1, not 0, so the
    // silent (for example muted autoplay) player keeps being polled.
    monitor.mediaStarted();
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 3);
    const calls = source.isCurrentlyAudible.mock.calls.length;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 3);
    expect(source.isCurrentlyAudible.mock.calls.length).toBeGreaterThan(calls);
  });

  it('stops polling after a bounded run of silent polls even if the count says playing', () => {
    const onChange = vi.fn();
    const monitor = createAudibleMonitor(source, onChange, AUDIBLE_POLL_MS, 5);
    // A player removed from the page without a pause event leaks this count.
    monitor.mediaStarted();
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 5);
    expect(source.isCurrentlyAudible).toHaveBeenCalledTimes(5);
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 20);
    expect(source.isCurrentlyAudible).toHaveBeenCalledTimes(5);

    // The leaked count is forgotten: a new player polls again, and pausing it
    // stops polling as soon as the guest is silent.
    monitor.mediaStarted();
    audibleNow = true;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    expect(onChange).toHaveBeenLastCalledWith(true);
    monitor.mediaPaused();
    audibleNow = false;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    expect(onChange).toHaveBeenLastCalledWith(false);
    const calls = source.isCurrentlyAudible.mock.calls.length;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 5);
    expect(source.isCurrentlyAudible.mock.calls.length).toBe(calls);
  });

  it('resets the silent run whenever sound is heard', () => {
    const onChange = vi.fn();
    const monitor = createAudibleMonitor(source, onChange, AUDIBLE_POLL_MS, 3);
    monitor.mediaStarted();
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 2);
    audibleNow = true;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    audibleNow = false;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 2);
    // 2 silent + 1 audible + 2 silent: still under the bound of 3 in a row.
    const calls = source.isCurrentlyAudible.mock.calls.length;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    expect(source.isCurrentlyAudible.mock.calls.length).toBe(calls + 1);
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 5);
    expect(source.isCurrentlyAudible.mock.calls.length).toBe(calls + 1);
  });

  it('defaults the silent-poll bound to one minute of polling', () => {
    expect(MAX_SILENT_POLLS * AUDIBLE_POLL_MS).toBe(60_000);
    const monitor = createAudibleMonitor(source, vi.fn());
    monitor.mediaStarted();
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * (MAX_SILENT_POLLS + 10));
    expect(source.isCurrentlyAudible).toHaveBeenCalledTimes(MAX_SILENT_POLLS);
  });

  it('treats a throwing guest as silent', () => {
    const onChange = vi.fn();
    const throwing = {
      isCurrentlyAudible: vi.fn(() => {
        throw new Error('The WebView must be attached to the DOM');
      }),
    };
    const monitor = createAudibleMonitor(throwing, onChange);
    monitor.mediaStarted();
    expect(() => vi.advanceTimersByTime(AUDIBLE_POLL_MS)).not.toThrow();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports silence and stops polling on dispose', () => {
    const onChange = vi.fn();
    const monitor = createAudibleMonitor(source, onChange);
    monitor.mediaStarted();
    audibleNow = true;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS);
    monitor.dispose();
    expect(onChange).toHaveBeenLastCalledWith(false);
    const calls = source.isCurrentlyAudible.mock.calls.length;
    vi.advanceTimersByTime(AUDIBLE_POLL_MS * 3);
    expect(source.isCurrentlyAudible.mock.calls.length).toBe(calls);
  });
});
