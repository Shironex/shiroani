import type { Meta, StoryObj } from '@storybook/react-vite';
import { Star, Plus } from 'lucide-react';
import { within, userEvent, expect, fn } from 'storybook/test';
import EmptyState from './EmptyState';

/**
 * Centered placeholder for empty lists/collections: a decorative icon tile, a
 * title and subtitle, and an optional call-to-action button. Used wherever a
 * filtered or freshly-created view has no rows to show.
 */
const meta = {
  title: 'shared/EmptyState',
  component: EmptyState,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    icon: { description: 'Lucide icon rendered (decoratively) in the tile above the title.' },
    title: { description: 'Primary line of copy.' },
    subtitle: { description: 'Secondary, muted line beneath the title.' },
    action: {
      description: 'Optional CTA button: `{ label, onClick, icon? }`. Omit for a passive state.',
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: { icon: Star, title: 'Nothing here yet', subtitle: 'Try adjusting your filters.' },
};

export const WithAction: Story = {
  args: {
    icon: Star,
    title: 'Nothing here yet',
    subtitle: 'Add your first entry to get started.',
    action: { label: 'Add new', onClick: fn(), icon: Plus },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Add new' }));
    await expect(args.action?.onClick).toHaveBeenCalledTimes(1);
  },
};
