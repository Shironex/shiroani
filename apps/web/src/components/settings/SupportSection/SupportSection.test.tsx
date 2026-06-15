import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { BUY_ME_A_COFFEE_URL, GITHUB_SPONSORS_URL } from '@/lib/constants';
import SupportSection from './SupportSection';

describe('SupportSection', () => {
  it('renders the support card title', () => {
    render(<SupportSection />);
    expect(screen.getByText('Support ShiroAni')).toBeInTheDocument();
  });

  it('opens the Buy-Me-a-Coffee page from the primary CTA', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = render(<SupportSection />);
    await user.click(screen.getByRole('button', { name: 'Buy me a coffee' }));
    expect(open).toHaveBeenCalledWith(BUY_ME_A_COFFEE_URL, '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('opens the GitHub Sponsors page from the sponsor CTA', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = render(<SupportSection />);
    await user.click(screen.getByRole('button', { name: 'Sponsor on GitHub' }));
    expect(open).toHaveBeenCalledWith(GITHUB_SPONSORS_URL, '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });
});
