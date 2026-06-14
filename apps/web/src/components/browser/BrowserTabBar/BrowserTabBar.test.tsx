import { describe, expect, it, vi } from 'vitest';
import type { BrowserNode } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import BrowserTabBar from './BrowserTabBar';

function leaf(id: string, title: string): BrowserNode {
  return {
    kind: 'leaf',
    id,
    url: `https://${id}.example`,
    title,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  };
}

const tabs: BrowserNode[] = [leaf('a', 'Shinden'), leaf('b', 'YouTube')];

function renderBar(overrides: Partial<React.ComponentProps<typeof BrowserTabBar>> = {}) {
  return render(
    <BrowserTabBar
      tabs={tabs}
      activeTabId="a"
      onSelectTab={vi.fn()}
      onCloseTab={vi.fn()}
      onNewTab={vi.fn()}
      onReorderTabs={vi.fn()}
      onSplitTabs={vi.fn()}
      {...overrides}
    />
  );
}

describe('BrowserTabBar', () => {
  it('renders a tab per node', () => {
    renderBar();

    expect(screen.getByText('Shinden')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('calls onNewTab when the new-tab button is pressed', async () => {
    const onNewTab = vi.fn();
    const { user } = renderBar({ onNewTab });

    await user.click(screen.getByTestId('browser-new-tab'));
    expect(onNewTab).toHaveBeenCalledOnce();
  });
});
