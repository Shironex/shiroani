import { describe, expect, it, vi } from 'vitest';
import type { QuickAccessSite } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import SiteCard from './SiteCard';

const site: QuickAccessSite = {
  id: 'yt',
  name: 'YouTube',
  url: 'https://youtube.com',
};

describe('SiteCard', () => {
  it('renders the site name and calls onClick when the tile is pressed', async () => {
    const onClick = vi.fn();
    const { user } = render(<SiteCard site={site} onClick={onClick} onRemove={vi.fn()} />);

    expect(screen.getByText('YouTube')).toBeInTheDocument();
    await user.click(screen.getByText('YouTube'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onRemove (not onClick) when the remove button is pressed', async () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    const { user } = render(<SiteCard site={site} onClick={onClick} onRemove={onRemove} />);

    await user.click(screen.getByLabelText('Remove site'));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });
});
