import { describe, expect, it, vi } from 'vitest';
import type { BrowserLeafNode, BrowserNode } from '@shiroani/shared';
import { render, screen, within } from '@/test/test-utils';
import BrowserTabBar from './BrowserTabBar';

function leaf(id: string, title: string, audio: Partial<BrowserLeafNode> = {}): BrowserNode {
  return {
    kind: 'leaf',
    id,
    url: `https://${id}.example`,
    title,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    ...audio,
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
  describe('audio indicator', () => {
    const audioTabs: BrowserNode[] = [
      leaf('a', 'Shinden', { isAudible: true }),
      leaf('b', 'YouTube', { isMuted: true }),
      leaf('c', 'Docs'),
    ];

    it('shows a speaker on an audible tab and a muted icon on a muted tab', () => {
      renderBar({ tabs: audioTabs });

      expect(within(getTab('Shinden')).getByTestId('browser-tab-audio')).toHaveAttribute(
        'data-audio-state',
        'audible'
      );
      expect(within(getTab('YouTube')).getByTestId('browser-tab-audio')).toHaveAttribute(
        'data-audio-state',
        'muted'
      );
      expect(within(getTab('Docs')).queryByTestId('browser-tab-audio')).not.toBeInTheDocument();
    });

    it('describes the audio state on the tab and in the icon title', () => {
      renderBar({ tabs: audioTabs });

      expect(getTab('Shinden')).toHaveAttribute('aria-description', 'Playing audio');
      expect(getTab('YouTube')).toHaveAttribute('aria-description', 'Muted');
      expect(getTab('Docs')).not.toHaveAttribute('aria-description');
      expect(within(getTab('Shinden')).getByTestId('browser-tab-audio')).toHaveAttribute(
        'title',
        'Playing audio. Click or press M to mute the tab'
      );
      expect(within(getTab('YouTube')).getByTestId('browser-tab-audio')).toHaveAttribute(
        'title',
        'Muted. Click or press M to unmute the tab'
      );
    });

    it('shows audio for a split tab when any pane is audible', () => {
      const split: BrowserNode = {
        kind: 'split',
        id: 's',
        orientation: 'horizontal',
        ratio: 0.5,
        left: leaf('l', 'Left'),
        right: leaf('r', 'Right', { isAudible: true }),
      };
      renderBar({ tabs: [split], activeTabId: 's' });

      expect(within(getTab('Left')).getByTestId('browser-tab-audio')).toHaveAttribute(
        'data-audio-state',
        'audible'
      );
    });

    it('toggles mute from the speaker icon without selecting the tab', async () => {
      const onToggleTabMuted = vi.fn();
      const onSelectTab = vi.fn();
      const { user } = renderBar({ tabs: audioTabs, onToggleTabMuted, onSelectTab });

      await user.click(within(getTab('YouTube')).getByTestId('browser-tab-audio'));

      expect(onToggleTabMuted).toHaveBeenCalledWith('b');
      expect(onSelectTab).not.toHaveBeenCalled();
    });

    it('toggles mute with M on the focused tab', async () => {
      const onToggleTabMuted = vi.fn();
      const { user } = renderBar({ tabs: audioTabs, onToggleTabMuted });

      getTab('Shinden').focus();
      await user.keyboard('m');
      expect(onToggleTabMuted).toHaveBeenCalledWith('a');
    });

    it('ignores M with a modifier (Ctrl+M, Shift+M)', async () => {
      const onToggleTabMuted = vi.fn();
      const { user } = renderBar({ tabs: audioTabs, onToggleTabMuted });

      getTab('Shinden').focus();
      await user.keyboard('{Control>}m{/Control}{Shift>}M{/Shift}');
      expect(onToggleTabMuted).not.toHaveBeenCalled();
    });

    it('advertises the M shortcut next to Delete', () => {
      renderBar({ tabs: audioTabs });
      expect(getTab('Docs')).toHaveAttribute('aria-keyshortcuts', 'Delete M');
    });
  });
});
