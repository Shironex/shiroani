import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAppStore } from '@/stores/useAppStore';
import AboutSection from './AboutSection';

describe('AboutSection', () => {
  it('renders the story card title', () => {
    render(<AboutSection />);
    expect(screen.getByRole('heading', { name: 'Story' })).toBeInTheDocument();
  });

  it('renders the app hero with a version pill', () => {
    render(<AboutSection />);
    // No electronAPI in jsdom, so the version stays at its placeholder.
    expect(screen.getByText('v…')).toBeInTheDocument();
  });

  it('reruns onboarding via the onboarding store', async () => {
    const reset = vi.fn();
    useOnboardingStore.setState({ reset });
    const { user } = render(<AboutSection />);
    await user.click(screen.getByRole('button', { name: 'Rerun setup wizard' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('navigates to the changelog view', async () => {
    const navigateTo = vi.fn();
    useAppStore.setState({ navigateTo });
    const { user } = render(<AboutSection />);
    await user.click(screen.getByRole('button', { name: 'View changelog' }));
    expect(navigateTo).toHaveBeenCalledWith('changelog');
  });

  it('opens the GitHub repo in a new tab', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = render(<AboutSection />);
    await user.click(screen.getByRole('button', { name: /github/i }));
    expect(open).toHaveBeenCalledWith(
      'https://github.com/Shironex/shiroani',
      '_blank',
      'noopener,noreferrer'
    );
    open.mockRestore();
  });
});
