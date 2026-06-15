import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { useDockStore } from '@/stores/useDockStore';
import { withFullHeight } from '../../../../../.storybook/decorators';
import DockStep from './DockStep';

/**
 * Onboarding step 05 · Navigation dock. An edge radiogroup with a live stage
 * preview plus auto-hide / labels / draggable toggles, all wired into the
 * DockStore. Stories seed `useDockStore` so the preview and controls start from
 * a known position.
 */
const meta = {
  title: 'onboarding/steps/DockStep',
  component: DockStep,
  parameters: {
    layout: 'fullscreen',
    // The edge picker is a labelled radiogroup; each toggle is a switch labelled
    // by its row title — axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useDockStore.setState({
      edge: 'bottom',
      autoHide: false,
      showLabels: true,
      draggable: false,
    });
  },
} satisfies Meta<typeof DockStep>;

export default meta;

type Story = StoryObj<typeof DockStep>;

/** Default — bottom edge, three preference toggles. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('radio', { name: 'Bottom', checked: true })).toBeInTheDocument();
    await expect(canvas.getAllByRole('switch')).toHaveLength(3);
  },
};

/** Choosing a new edge and flipping a toggle both write through the store. */
export const ChangesEdgeAndToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('radio', { name: 'Left' }));
    await waitFor(() => expect(useDockStore.getState().edge).toBe('left'));

    await userEvent.click(canvas.getByRole('switch', { name: 'Auto-hide' }));
    await waitFor(() => expect(useDockStore.getState().autoHide).toBe(true));
  },
};
