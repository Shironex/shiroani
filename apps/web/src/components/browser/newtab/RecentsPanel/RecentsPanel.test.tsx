import { describe, expect, it, vi } from 'vitest';
import type { FrequentSite } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import RecentsPanel from './RecentsPanel';

const frequentSites: FrequentSite[] = [
  {
    url: 'https://shinden.pl',
    title: 'Shinden',
    visitCount: 12,
    lastVisited: 1_717_000_000_000,
  },
];

describe('RecentsPanel', () => {
  it('renders frequent site rows when present', () => {
    render(<RecentsPanel frequentSites={frequentSites} onNavigate={vi.fn()} />);

    expect(screen.getByText('Recently visited')).toBeInTheDocument();
    expect(screen.getByText('Shinden')).toBeInTheDocument();
  });

  it('renders the empty state when there are no frequent sites', () => {
    render(<RecentsPanel frequentSites={[]} onNavigate={vi.fn()} />);

    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });
});
