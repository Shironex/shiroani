import type { Meta, StoryObj } from '@storybook/react-vite';
import Timeline from './Timeline';

/**
 * Reusable vertical timeline primitive. A two-column grid: a narrow left label
 * (title + timestamp), a 1px vertical rail with a colored dot per entry, and an
 * arbitrary content column on the right. Entries can override their dot via the
 * `marker` slot or pick a `markerVariant` (solid/outline/dashed). Purely
 * presentational — the rail and markers are decorative (aria-hidden).
 */
const meta = {
  title: 'shared/Timeline',
  component: Timeline,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    entries: {
      description: 'Ordered list of timeline entries (id, title, timestamp, marker, children).',
    },
    sideWidth: { description: 'Fixed width of the left label column in px (default 76).' },
    gap: {
      description: 'Horizontal gap in px between the rail and the content column (default 48).',
    },
  },
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

export const Empty: Story = {
  args: { entries: [] },
};

export const MarkerVariants: Story = {
  args: {
    entries: [
      {
        id: 'solid',
        title: 'v2.0.0',
        timestamp: 'Now',
        markerVariant: 'solid',
        children: <p className="text-sm text-foreground">Solid marker (latest).</p>,
      },
      {
        id: 'outline',
        title: 'v1.0.0',
        timestamp: 'Earlier',
        markerVariant: 'outline',
        children: <p className="text-sm text-muted-foreground">Outline marker.</p>,
      },
      {
        id: 'dashed',
        timestamp: 'Origin',
        markerVariant: 'dashed',
        children: <p className="text-sm text-muted-foreground">Dashed end-of-history marker.</p>,
      },
    ],
  },
};
