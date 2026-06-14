import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
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
});
