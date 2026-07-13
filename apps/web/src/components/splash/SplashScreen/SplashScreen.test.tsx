import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@/test/test-utils';
import { useUpdateStore } from '@/stores/useUpdateStore';
import SplashScreen from './SplashScreen';

beforeEach(() => {
  useUpdateStore.setState({ isInstalling: false, updateInfo: null });
});

describe('SplashScreen', () => {
  it('renders the loading hero while not ready', () => {
    render(<SplashScreen ready={false} error={null} />);
    expect(screen.getByText('白アニ · your anime')).toBeInTheDocument();
    expect(screen.getByAltText('ShiroAni mascot')).toBeInTheDocument();
  });

  it('renders the error state with close and retry actions', () => {
    render(<SplashScreen ready={false} error="network unreachable" />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows the updating variant while an install is in flight', () => {
    useUpdateStore.setState({ isInstalling: true, updateInfo: { version: '0.6.0' } as never });
    render(<SplashScreen ready={false} error={null} />);
    expect(screen.getByText('updating · v0.6.0')).toBeInTheDocument();
  });

  it('surfaces an error even while installing (error wins over updating)', () => {
    useUpdateStore.setState({ isInstalling: true, updateInfo: { version: '0.6.0' } as never });
    render(<SplashScreen ready={false} error="network unreachable" />);
    // Error actions, not the updating subtitle.
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('updating · v0.6.0')).not.toBeInTheDocument();
  });

  it('stays mounted while ready but still within the minimum display window', () => {
    // No fake timers — the min-display timer has not fired, so the overlay
    // must remain visible even though `ready` is already true.
    render(<SplashScreen ready error={null} />);
    expect(screen.getByText('白アニ · your anime')).toBeInTheDocument();
  });

  describe('dismissal', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('dismisses and fires onDismissed after the min-display + exit window', () => {
      const onDismissed = vi.fn();
      render(<SplashScreen ready error={null} onDismissed={onDismissed} />);
      // Min display (1400ms) elapses → dismissing begins.
      act(() => {
        vi.advanceTimersByTime(1400);
      });
      expect(onDismissed).not.toHaveBeenCalled();
      // Exit animation (600ms) completes → overlay unmounts + callback fires.
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(onDismissed).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('白アニ · your anime')).not.toBeInTheDocument();
    });

    it('does not dismiss while still installing, even when ready', () => {
      useUpdateStore.setState({ isInstalling: true, updateInfo: null });
      const onDismissed = vi.fn();
      render(<SplashScreen ready error={null} onDismissed={onDismissed} />);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(onDismissed).not.toHaveBeenCalled();
    });
  });
});
