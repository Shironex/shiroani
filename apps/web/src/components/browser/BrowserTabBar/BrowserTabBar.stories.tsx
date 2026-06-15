import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { BrowserNode } from '@shiroani/shared';
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

/**
 * Chromium-like tab strip: a `role="tablist"` of rounded-top chips (favicon +
 * title + presentational close icon) plus a trailing new-tab button. The active
 * chip carries `aria-selected` and a primary-tinted glow; the close icon is
 * hidden until hover on inactive chips and is also reachable via the
 * Delete/Backspace shortcut on the focused tab. Tabs are reorderable (dnd-kit)
 * and can be dropped onto each other to split — those drag gestures are covered
 * in the unit suite; stories drive click/keyboard chrome only.
 */
const meta = {
  title: 'browser/BrowserTabBar',
  component: BrowserTabBar,
  parameters: {
    // Each chip is a single role="tab" (its title is its name); the close icon
    // is presentational (closed via click or Delete), and the new-tab button is
    // labelled — so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    tabs: { description: 'Top-level browser nodes (leaf tabs or splits) rendered as chips.' },
    activeTabId: { control: 'text', description: 'Id of the selected tab, or null when none.' },
    onSelectTab: { description: 'Called with a tab id when a chip is activated.' },
    onCloseTab: { description: 'Called with a tab id from the close icon or Delete shortcut.' },
    onNewTab: { description: 'Called when the trailing new-tab button is pressed.' },
    onReorderTabs: { description: 'Called with (activeId, overId) after a reorder drag.' },
    onSplitTabs: {
      description: 'Optional — when set, dropping a tab onto another splits them side by side.',
    },
  },
  args: {
    tabs,
    activeTabId: 'a',
    onSelectTab: fn(),
    onCloseTab: fn(),
    onNewTab: fn(),
    onReorderTabs: fn(),
    onSplitTabs: fn(),
  },
} satisfies Meta<typeof BrowserTabBar>;

export default meta;

type Story = StoryObj<typeof BrowserTabBar>;

/** Two tabs, the first active — the resting state of the strip. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const tabs = canvas.getAllByRole('tab');
    await expect(tabs).toHaveLength(2);
    await expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    // Clicking the inactive chip selects it.
    await userEvent.click(canvas.getByText('YouTube'));
    await expect(args.onSelectTab).toHaveBeenCalledWith('b');
  },
};

/** Clicking a chip's close affordance reports the id without switching to it. */
export const CloseTab: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const chip = canvas.getByText('Shinden').closest('[role="tab"]') as HTMLElement;
    await userEvent.click(within(chip).getByTestId('browser-tab-close'));
    await expect(args.onCloseTab).toHaveBeenCalledWith('a');
    await expect(args.onSelectTab).not.toHaveBeenCalled();
  },
};

/** Pressing the trailing new-tab button. */
export const NewTab: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('browser-new-tab'));
    await expect(args.onNewTab).toHaveBeenCalledOnce();
  },
};
