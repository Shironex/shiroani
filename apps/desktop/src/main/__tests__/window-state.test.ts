import { EventEmitter } from 'events';
import {
  createWindowStateSaver,
  DEFAULT_WINDOW_SIZE,
  parseSavedBounds,
  parseSavedMaximized,
  resolveInitialBounds,
  type PersistedWindowState,
  type Rect,
} from '../window-state';

const PRIMARY: Rect = { x: 0, y: 25, width: 1920, height: 1055 };
// Second monitor to the right of the primary one.
const SECONDARY: Rect = { x: 1920, y: 0, width: 2560, height: 1400 };

describe('parseSavedBounds', () => {
  it('accepts a well-formed rectangle', () => {
    expect(parseSavedBounds({ x: 10, y: -20, width: 1000, height: 700 })).toEqual({
      x: 10,
      y: -20,
      width: 1000,
      height: 700,
    });
  });

  it('rounds fractional values', () => {
    expect(parseSavedBounds({ x: 10.4, y: 20.6, width: 1000.5, height: 700.2 })).toEqual({
      x: 10,
      y: 21,
      width: 1001,
      height: 700,
    });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', '{"x":0}'],
    ['an array', [0, 0, 800, 600]],
    ['missing fields', { x: 0, y: 0, width: 800 }],
    ['string numbers', { x: '0', y: 0, width: 800, height: 600 }],
    ['NaN', { x: NaN, y: 0, width: 800, height: 600 }],
    ['Infinity', { x: 0, y: 0, width: Infinity, height: 600 }],
    ['zero width', { x: 0, y: 0, width: 0, height: 600 }],
    ['negative height', { x: 0, y: 0, width: 800, height: -600 }],
    ['absurd size', { x: 0, y: 0, width: 5_000_000, height: 600 }],
    ['absurd position', { x: -9_000_000, y: 0, width: 800, height: 600 }],
  ])('rejects %s', (_label, value) => {
    expect(parseSavedBounds(value)).toBeNull();
  });
});

describe('parseSavedMaximized', () => {
  it('is true only for a literal true', () => {
    expect(parseSavedMaximized(true)).toBe(true);
    expect(parseSavedMaximized('true')).toBe(false);
    expect(parseSavedMaximized(1)).toBe(false);
    expect(parseSavedMaximized(undefined)).toBe(false);
  });
});

describe('resolveInitialBounds', () => {
  it('centers the default size on the primary display when nothing is saved', () => {
    expect(resolveInitialBounds(null, [PRIMARY, SECONDARY], PRIMARY)).toEqual({
      x: 260,
      y: 103,
      width: 1400,
      height: 900,
    });
  });

  it('shrinks the default size to fit a small primary display', () => {
    const laptop: Rect = { x: 0, y: 0, width: 1366, height: 728 };
    expect(resolveInitialBounds(null, [laptop], laptop)).toEqual({
      x: 0,
      y: 0,
      width: 1366,
      height: 728,
    });
  });

  it('restores saved bounds that sit fully on a display', () => {
    const saved: Rect = { x: 100, y: 120, width: 1200, height: 800 };
    expect(resolveInitialBounds(saved, [PRIMARY, SECONDARY], PRIMARY)).toEqual(saved);
  });

  it('restores a window that lives on the second display', () => {
    const saved: Rect = { x: 2200, y: 150, width: 1600, height: 1000 };
    expect(resolveInitialBounds(saved, [PRIMARY, SECONDARY], PRIMARY)).toEqual(saved);
  });

  it('falls back to defaults on the primary display when the saved display is gone', () => {
    const saved: Rect = { x: 2200, y: 150, width: 1600, height: 1000 };
    expect(resolveInitialBounds(saved, [PRIMARY], PRIMARY)).toEqual({
      x: 260,
      y: 103,
      width: 1400,
      height: 900,
    });
  });

  it('treats a sliver of overlap as not visible', () => {
    // Only 50px of the window reach the primary display.
    const saved: Rect = { x: 1870, y: 100, width: 1200, height: 800 };
    expect(resolveInitialBounds(saved, [PRIMARY], PRIMARY)).toEqual({
      x: 260,
      y: 103,
      width: 1400,
      height: 900,
    });
  });

  it('pulls a partly off-screen window fully onto its display', () => {
    const saved: Rect = { x: -300, y: 600, width: 1200, height: 800 };
    expect(resolveInitialBounds(saved, [PRIMARY], PRIMARY)).toEqual({
      x: 0,
      y: 280,
      width: 1200,
      height: 800,
    });
  });

  it('picks the display that shows most of a window straddling two monitors', () => {
    // 300px on the primary, 900px on the secondary.
    const saved: Rect = { x: 1620, y: 100, width: 1200, height: 800 };
    expect(resolveInitialBounds(saved, [PRIMARY, SECONDARY], PRIMARY)).toEqual({
      x: 1920,
      y: 100,
      width: 1200,
      height: 800,
    });
  });

  it('clamps a window larger than the work area', () => {
    const saved: Rect = { x: -50, y: 0, width: 3000, height: 2000 };
    expect(resolveInitialBounds(saved, [PRIMARY], PRIMARY)).toEqual(PRIMARY);
  });

  it('enforces the minimum size', () => {
    const saved: Rect = { x: 100, y: 100, width: 300, height: 200 };
    expect(resolveInitialBounds(saved, [PRIMARY], PRIMARY)).toEqual({
      x: 100,
      y: 100,
      width: DEFAULT_WINDOW_SIZE.minWidth,
      height: DEFAULT_WINDOW_SIZE.minHeight,
    });
  });
});

class FakeWindow extends EventEmitter {
  destroyed = false;
  maximized = false;
  minimized = false;
  fullScreen = false;
  normalBounds: Rect = { x: 100, y: 100, width: 1200, height: 800 };

  isDestroyed(): boolean {
    return this.destroyed;
  }
  isMaximized(): boolean {
    return this.maximized;
  }
  isMinimized(): boolean {
    return this.minimized;
  }
  isFullScreen(): boolean {
    return this.fullScreen;
  }
  getNormalBounds(): Rect {
    return { ...this.normalBounds };
  }
}

describe('createWindowStateSaver', () => {
  let win: FakeWindow;
  let persist: jest.Mock<void, [PersistedWindowState]>;

  beforeEach(() => {
    jest.useFakeTimers();
    win = new FakeWindow();
    persist = jest.fn();
    createWindowStateSaver(win, persist, 500);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces resize and move bursts into one save', () => {
    win.emit('move');
    win.emit('resize');
    win.normalBounds = { x: 200, y: 150, width: 1300, height: 850 };
    win.emit('move');
    expect(persist).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({
      bounds: { x: 200, y: 150, width: 1300, height: 850 },
      maximized: false,
    });
  });

  it('saves the normal bounds and the flag right away on maximize and unmaximize', () => {
    win.maximized = true;
    win.emit('maximize');
    expect(persist).toHaveBeenLastCalledWith({
      bounds: { x: 100, y: 100, width: 1200, height: 800 },
      maximized: true,
    });

    win.maximized = false;
    win.emit('unmaximize');
    expect(persist).toHaveBeenLastCalledWith({
      bounds: { x: 100, y: 100, width: 1200, height: 800 },
      maximized: false,
    });
  });

  it('saves synchronously on close, cancelling the pending debounce', () => {
    win.emit('resize');
    win.emit('close');
    expect(persist).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('never writes while fullscreen', () => {
    win.emit('resize');
    win.fullScreen = true;
    win.emit('enter-full-screen');
    win.normalBounds = { x: 0, y: 0, width: 1920, height: 1080 };
    win.emit('resize');
    jest.advanceTimersByTime(500);
    win.emit('close');
    expect(persist).not.toHaveBeenCalled();
  });

  it('drops a save queued just before fullscreen kicks in', () => {
    win.emit('resize');
    win.emit('enter-full-screen');
    jest.advanceTimersByTime(500);
    expect(persist).not.toHaveBeenCalled();
  });

  it('never writes while minimized', () => {
    win.minimized = true;
    win.emit('close');
    expect(persist).not.toHaveBeenCalled();
  });

  it('skips writes when nothing changed', () => {
    win.emit('close');
    win.emit('close');
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('does nothing once the window is destroyed', () => {
    win.emit('resize');
    win.destroyed = true;
    jest.advanceTimersByTime(500);
    expect(persist).not.toHaveBeenCalled();
  });
});
