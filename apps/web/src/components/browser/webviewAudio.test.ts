import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AUDIBLE_POLL_MS, createAudibleMonitor } from './webviewAudio';

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
