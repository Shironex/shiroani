import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ChangelogView from './ChangelogView';

describe('ChangelogView', () => {
  it('renders the headline subtitle and filter chips', () => {
    render(<ChangelogView />);

    expect(screen.getByText(/change history/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Major releases/i })).toBeInTheDocument();
  });

  it('shows the origin marker on the full list and hides it when filtering', async () => {
    const { user } = render(<ChangelogView />);

    // "all" filter is the default — the closing origin marker is present.
    expect(screen.getByText(/Origin · 2026/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Major releases/i }));
    expect(screen.queryByText(/Origin · 2026/)).not.toBeInTheDocument();
  });
});
