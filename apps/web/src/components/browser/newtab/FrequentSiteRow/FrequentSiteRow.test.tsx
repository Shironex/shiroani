import { describe, expect, it, vi } from 'vitest';
import type { FrequentSite } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import FrequentSiteRow from './FrequentSiteRow';
import { EmptyRecents } from './FrequentSiteRow.parts';

const site: FrequentSite = {
  url: 'https://shinden.pl',
  title: 'Shinden',
  visitCount: 12,
  lastVisited: 1_717_000_000_000,
};

describe('FrequentSiteRow', () => {
  it('renders the site title and calls onClick when pressed', async () => {
    const onClick = vi.fn();
    const { user } = render(<FrequentSiteRow site={site} onClick={onClick} />);

    expect(screen.getByText('Shinden')).toBeInTheDocument();
    await user.click(screen.getByText('Shinden'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders the empty-recents fallback', () => {
    render(<EmptyRecents />);
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });
});
