import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useDockStore } from '@/stores/useDockStore';
import DockSection from './DockSection';

const setEdge = fn();
const setAutoHide = fn();
const setShowLabels = fn();
const setDraggable = fn();
const resetPosition = fn();

/**
 * Settings · Dock section. Combines a live `DockStage` preview and a
 * `DockEdgePicker` radiogroup (top/bottom/left/right) with three behaviour
 * toggles — auto-hide, show labels, and draggable — plus a reset-position
 * action. Every control reads and writes the `DockStore`; the decorator seeds
 * the store and stubs its setters to `fn()` so stories stay deterministic and
 * never persist to disk.
 */
const meta = {
  title: 'settings/DockSection',
  component: DockSection,
  parameters: {
    // The edge radiogroup, the named toggles, and the reset button all carry
    // accessible names, so axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [
    Story => {
      useDockStore.setState({
        edge: 'bottom',
        autoHide: false,
        showLabels: true,
        draggable: true,
        setEdge,
        setAutoHide,
        setShowLabels,
        setDraggable,
        resetPosition,
      });
      return <Story />;
    },
  ],
} satisfies Meta<typeof DockSection>;

export default meta;

type Story = StoryObj<typeof DockSection>;

export const Default: Story = {};

/** Choosing a different edge in the radiogroup reports it through `setEdge`. */
export const SelectsEdge: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: 'Top' }));
    await expect(setEdge).toHaveBeenCalledWith('top');
  },
};

/** Toggling a behaviour switch reports the next value through its store setter. */
export const TogglesAutoHide: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('switch', { name: 'Auto-hide' }));
    await expect(setAutoHide).toHaveBeenCalledWith(true);
  },
};

/** The reset-position action calls `resetPosition`. */
export const ResetsPosition: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Reset position' }));
    await expect(resetPosition).toHaveBeenCalled();
  },
};
