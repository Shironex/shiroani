import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SuiteSection from './SuiteSection';

describe('SuiteSection', () => {
  it('renders the suite card title', () => {
    render(<SuiteSection />);
    expect(screen.getByText('App family')).toBeInTheDocument();
  });

  it('renders a card for each sibling app', () => {
    render(<SuiteSection />);
    expect(screen.getByRole('heading', { name: /Shiranami/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /KireiManga/ })).toBeInTheDocument();
  });

  it('opens the app site in a new tab from its CTA', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = render(<SuiteSection />);
    await user.click(screen.getByRole('button', { name: /Check out Shiranami/ }));
    expect(open).toHaveBeenCalledWith('https://shiranami.app', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });
});
