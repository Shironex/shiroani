import { describe, expect, it, vi } from 'vitest';
import type { QuickAccessSite } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import QuickAccessPanel from './QuickAccessPanel';

const sites: QuickAccessSite[] = [
  { id: 'yt', name: 'YouTube', url: 'https://youtube.com', isPredefined: true },
];

function renderPanel(overrides: Partial<React.ComponentProps<typeof QuickAccessPanel>> = {}) {
  return render(
    <QuickAccessPanel
      sites={sites}
      hiddenPredefined={[]}
      onNavigate={vi.fn()}
      onRemove={vi.fn()}
      onAdd={vi.fn()}
      onShowPredefined={vi.fn()}
      {...overrides}
    />
  );
}

describe('QuickAccessPanel', () => {
  it('renders the panel title and a site card', () => {
    renderPanel();

    expect(screen.getByText('Quick access')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('calls onAdd when the add tile is pressed', async () => {
    const onAdd = vi.fn();
    const { user } = renderPanel({ onAdd });

    await user.click(screen.getByLabelText('Add a site to quick access'));
    expect(onAdd).toHaveBeenCalledOnce();
  });
});
