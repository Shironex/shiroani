import type { Meta, StoryObj } from '@storybook/react-vite';
import DockStage from './DockStage';

/**
 * Miniature, non-interactive preview of the floating dock positioned by edge.
 * It composes `PreviewStage` (gridded backdrop) with a `MiniDock` whose slots
 * orient as a row for top/bottom edges and a column for left/right. With no
 * `items` it falls back to a 4-dot placeholder. All dock chrome is decorative,
 * so the stage carries no interactive controls.
 */
const meta = {
  title: 'shared/DockStage',
  component: DockStage,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    edge: {
      control: 'inline-radio',
      options: ['top', 'bottom', 'left', 'right'],
      description:
        'Screen edge the mini-dock is anchored to; also picks its row/column orientation.',
    },
    height: { description: 'Override the stage height in px (default 144).' },
    items: {
      description:
        'Explicit dock slots to render. When omitted (or empty) a 4-dot placeholder is shown.',
    },
    label: { description: 'Optional uppercase caption rendered above the stage (e.g. "PODGLĄD").' },
  },
} satisfies Meta<typeof DockStage>;

export default meta;

type Story = StoryObj<typeof DockStage>;

export const Bottom: Story = {
  args: { edge: 'bottom', label: 'PODGLĄD' },
};

export const Left: Story = {
  args: { edge: 'left' },
};

export const WithItems: Story = {
  args: {
    edge: 'bottom',
    label: 'PODGLĄD',
    items: [{ id: '0', highlighted: true }, { id: '1' }, { id: '2' }],
  },
};
