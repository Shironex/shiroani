import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { useAppStore } from '@/stores/useAppStore';
import { useDockStore } from '@/stores/useDockStore';
import NavigationDock from './NavigationDock';

/**
 * The floating primary navigation dock. Renders the visible nav items (order +
 * visibility come from `DockStore`) as icon buttons with an animated sliding
 * active pill, plus a drag handle when the dock is draggable. With `autoHide`
 * on it collapses to a single logo button that re-expands on hover/click. Edge,
 * orientation, labels and active view are all driven by the app + dock stores,
 * which the decorator seeds to a deterministic baseline.
 */
const meta: Meta<typeof NavigationDock> = {
  title: 'shared/NavigationDock',
  component: NavigationDock,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  argTypes: {
    hasBg: {
      control: 'boolean',
      description:
        'Whether a custom background is active — switches the dock to a darker glass fill.',
    },
  },
  decorators: [
    Story => {
      useAppStore.setState({ activeView: 'browser' });
      useDockStore.setState({
        edge: 'bottom',
        offset: 50,
        autoHide: false,
        draggable: true,
        showLabels: true,
        isDragging: false,
        dragPosition: null,
        isExpanded: false,
      });
      return (
        <div style={{ height: '100vh', position: 'relative' }}>
          <Story />
        </div>
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof NavigationDock>;

export const Default: Story = {
  args: { hasBg: false },
};

export const IconOnly: Story = {
  args: { hasBg: false },
  decorators: [
    Story => {
      useDockStore.setState({ showLabels: false });
      return <Story />;
    },
  ],
};

export const VerticalLeftEdge: Story = {
  args: { hasBg: false },
  decorators: [
    Story => {
      useDockStore.setState({ edge: 'left' });
      return <Story />;
    },
  ],
};

/**
 * `autoHide` collapses the dock to a single logo button that re-expands the
 * full nav when activated.
 */
export const CollapsedAutoHide: Story = {
  args: { hasBg: false },
  decorators: [
    Story => {
      useDockStore.setState({ autoHide: true, isExpanded: false });
      return <Story />;
    },
  ],
};

/**
 * Clicking a nav item navigates to its view — the clicked button gains
 * `aria-current="page"` and the app store's `activeView` updates.
 */
export const NavigatesOnClick: Story = {
  args: { hasBg: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Diary' }));
    await waitFor(() => expect(useAppStore.getState().activeView).toBe('diary'));
    await expect(canvas.getByRole('button', { name: 'Diary' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  },
};

/**
 * The collapsed logo is a real button labelled for screen readers; activating
 * it expands the dock.
 */
export const ExpandsFromCollapsed: Story = {
  args: { hasBg: false },
  decorators: [
    Story => {
      useDockStore.setState({ autoHide: true, isExpanded: false });
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const logoButton = canvas.getByRole('button', { name: 'Expand navigation' });
    await userEvent.click(logoButton);
    await waitFor(() => expect(useDockStore.getState().isExpanded).toBe(true));
  },
};
