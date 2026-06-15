import { describe, expect, it, vi } from 'vitest';
import type { BrowserNode } from '@shiroani/shared';
import { render, screen, within } from '@/test/test-utils';
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

/** The role="tab" chip whose label text matches `title`. */
function getTab(title: string): HTMLElement {
  return screen.getByText(title).closest('[role="tab"]') as HTMLElement;
}

describe('BrowserTabBar', () => {
  it('renders a tab per node', () => {
    renderBar();

    expect(screen.getByText('Shinden')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('exposes each chip as a tab inside a tablist', () => {
    renderBar();

    const tablist = screen.getByRole('tablist');
    expect(within(tablist).getAllByRole('tab')).toHaveLength(2);
  });

  it('marks the active tab with aria-selected', () => {
    renderBar({ activeTabId: 'b' });

    expect(getTab('Shinden')).toHaveAttribute('aria-selected', 'false');
    expect(getTab('YouTube')).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onSelectTab with the clicked tab id', async () => {
    const onSelectTab = vi.fn();
    const { user } = renderBar({ onSelectTab });

    await user.click(getTab('YouTube'));
    expect(onSelectTab).toHaveBeenCalledWith('b');
  });

  it('selects a tab with the keyboard (Enter)', async () => {
    const onSelectTab = vi.fn();
    const { user } = renderBar({ onSelectTab });

    getTab('Shinden').focus();
    await user.keyboard('{Enter}');
    expect(onSelectTab).toHaveBeenCalledWith('a');
  });

  it('calls onCloseTab with the tab id when its close affordance is clicked', async () => {
    const onCloseTab = vi.fn();
    const onSelectTab = vi.fn();
    const { user } = renderBar({ onCloseTab, onSelectTab });

    const closeAffordance = within(getTab('Shinden')).getByTestId('browser-tab-close');
    await user.click(closeAffordance);

    expect(onCloseTab).toHaveBeenCalledWith('a');
    // Closing a tab must not also switch to it.
    expect(onSelectTab).not.toHaveBeenCalled();
  });

  it('closes the focused tab with the Delete shortcut', async () => {
    const onCloseTab = vi.fn();
    const { user } = renderBar({ onCloseTab });

    getTab('Shinden').focus();
    await user.keyboard('{Delete}');
    expect(onCloseTab).toHaveBeenCalledWith('a');
  });

  it('calls onNewTab when the new-tab button is pressed', async () => {
    const onNewTab = vi.fn();
    const { user } = renderBar({ onNewTab });

    await user.click(screen.getByTestId('browser-new-tab'));
    expect(onNewTab).toHaveBeenCalledOnce();
  });

  it('falls back to the "New tab" label for an untitled tab', () => {
    renderBar({ tabs: [leaf('a', '')] });

    expect(screen.getByText('New tab')).toBeInTheDocument();
  });
});
