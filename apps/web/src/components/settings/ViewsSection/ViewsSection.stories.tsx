import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useDockStore } from '@/stores/useDockStore';
import { DEFAULT_VIEW_ORDER } from '@/lib/nav-items';
import ViewsSection from './ViewsSection';

const toggleViewVisibility = fn();
const reorderViews = fn();
const resetViews = fn();

/**
 * Settings · Views section. Lists every navigation view as a sortable row with
 * a visibility toggle, mirrored live in a `DockStage` preview. Rows can be
 * dragged to reorder; the always-visible Settings view is locked on. Toggling,
 * reordering, and reset all write to the `DockStore`; the decorator seeds the
 * store and stubs its actions to `fn()` so stories never persist to disk.
 */
const meta = {
  title: 'settings/ViewsSection',
  component: ViewsSection,
  parameters: {
    // Each row toggle is labelled by its view name and each drag handle has an
    // aria-label, so axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [
    Story => {
      useDockStore.setState({
        edge: 'bottom',
        order: DEFAULT_VIEW_ORDER,
        hiddenViews: ['changelog'],
        toggleViewVisibility,
        reorderViews,
        resetViews,
      });
      return <Story />;
    },
  ],
} satisfies Meta<typeof ViewsSection>;

export default meta;

type Story = StoryObj<typeof ViewsSection>;

export const Default: Story = {};

/** Toggling a view's visibility reports its id through `toggleViewVisibility`. */
export const TogglesVisibility: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('switch', { name: /Library/ }));
    await expect(toggleViewVisibility).toHaveBeenCalledWith('library');
  },
};

/** The reset action restores the default order and visibility via `resetViews`. */
export const ResetsViews: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Reset to defaults' }));
    await expect(resetViews).toHaveBeenCalled();
  },
};
