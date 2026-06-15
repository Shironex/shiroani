import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useSupportBannerStore } from '@/stores/useSupportBannerStore';
import { SupportBanner } from '@/components/shared/SupportBanner';

describe('SupportBanner', () => {
  const realSetSeen = useSupportBannerStore.getState().setSeen;

  beforeEach(() => {
    // Reset visibility and restore the real action (tests below swap it for spies).
    useSupportBannerStore.setState({ seen: false, setSeen: realSetSeen });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the support banner when not yet seen', () => {
    render(<SupportBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy me a coffee' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sponsor on GitHub' })).toBeInTheDocument();
  });

  it('renders nothing once dismissed', () => {
    useSupportBannerStore.setState({ seen: true });
    const { container } = render(<SupportBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('dismisses the banner via the icon-only dismiss button', async () => {
    const setSeen = vi.fn();
    useSupportBannerStore.setState({ seen: false, setSeen });
    const { user } = render(<SupportBanner />);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(setSeen).toHaveBeenCalledTimes(1);
  });

  it('opens the Buy me a coffee link and marks the banner seen', async () => {
    const setSeen = vi.fn();
    useSupportBannerStore.setState({ seen: false, setSeen });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = render(<SupportBanner />);
    await user.click(screen.getByRole('button', { name: 'Buy me a coffee' }));
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.buymeacoffee.com/shirone',
      '_blank',
      'noopener,noreferrer'
    );
    expect(setSeen).toHaveBeenCalledTimes(1);
  });

  it('opens the GitHub sponsors link and marks the banner seen', async () => {
    const setSeen = vi.fn();
    useSupportBannerStore.setState({ seen: false, setSeen });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = render(<SupportBanner />);
    await user.click(screen.getByRole('button', { name: 'Sponsor on GitHub' }));
    expect(openSpy).toHaveBeenCalledWith(
      'https://github.com/sponsors/Shironex',
      '_blank',
      'noopener,noreferrer'
    );
    expect(setSeen).toHaveBeenCalledTimes(1);
  });
});
