import type { Meta, StoryObj } from '@storybook/react-vite';
import Timeline from './Timeline';

const meta = {
  title: 'shared/Timeline',
  component: Timeline,
} satisfies Meta<typeof Timeline>;

export default meta;

type Story = StoryObj<typeof Timeline>;

export const Default: Story = {
  args: {
    entries: [
      {
        id: 'v1-0-0',
        title: 'v1.0.0',
        timestamp: '2026-06',
        markerVariant: 'solid',
        children: <p className="text-sm text-foreground">First stable release.</p>,
      },
      {
        id: 'v0-9-0',
        title: 'v0.9.0',
        timestamp: '2026-05',
        children: <p className="text-sm text-muted-foreground">Beta polish.</p>,
      },
    ],
  },
};
