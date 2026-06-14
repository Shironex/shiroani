import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SplashHero from './SplashHero';

describe('SplashHero', () => {
  it('renders the loading subtitle and mascot', () => {
    render(<SplashHero variant="loading" />);
    expect(screen.getByText('白アニ · your anime')).toBeInTheDocument();
    expect(screen.getByAltText('ShiroAni mascot')).toBeInTheDocument();
  });

  it('renders the network error paragraph for a connection failure', () => {
    render(<SplashHero variant="error" errorMessage="network unreachable" />);
    expect(screen.getByText("We can't reach AniList. Try again in a moment.")).toBeInTheDocument();
  });
});
