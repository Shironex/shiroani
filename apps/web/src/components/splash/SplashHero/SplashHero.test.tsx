import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SplashHero from './SplashHero';

describe('SplashHero', () => {
  it('renders the loading subtitle and waving mascot by default', () => {
    render(<SplashHero variant="loading" />);
    expect(screen.getByText('白アニ · your anime')).toBeInTheDocument();
    expect(screen.getByAltText('ShiroAni mascot')).toBeInTheDocument();
  });

  it('defaults to the loading variant when none is given', () => {
    render(<SplashHero />);
    expect(screen.getByText('白アニ · your anime')).toBeInTheDocument();
  });

  it('shows the updating subtitle with the target version when updating', () => {
    render(<SplashHero variant="updating" updatingTarget="v0.6.0" />);
    expect(screen.getByText('updating · v0.6.0')).toBeInTheDocument();
  });

  it('falls back to the generic updating subtitle without a target', () => {
    render(<SplashHero variant="updating" />);
    expect(screen.getByText('updating · install in progress')).toBeInTheDocument();
  });

  it('renders the network error paragraph for a connection failure', () => {
    render(<SplashHero variant="error" errorMessage="network unreachable" />);
    expect(screen.getByText("We can't reach AniList. Try again in a moment.")).toBeInTheDocument();
    expect(screen.getByText('no connection · offline mode')).toBeInTheDocument();
  });

  it('treats a missing error message as a network failure (offline copy)', () => {
    render(<SplashHero variant="error" errorMessage={null} />);
    expect(screen.getByText("We can't reach AniList. Try again in a moment.")).toBeInTheDocument();
  });

  it('renders the generic error paragraph for a non-network failure', () => {
    render(<SplashHero variant="error" errorMessage="Unexpected token in module" />);
    expect(
      screen.getByText('Something unexpectedly stopped the app from starting.')
    ).toBeInTheDocument();
    expect(screen.getByText('something went wrong · try again')).toBeInTheDocument();
  });

  it('does not render an error paragraph on the loading variant', () => {
    render(<SplashHero variant="loading" />);
    expect(
      screen.queryByText("We can't reach AniList. Try again in a moment.")
    ).not.toBeInTheDocument();
  });
});
