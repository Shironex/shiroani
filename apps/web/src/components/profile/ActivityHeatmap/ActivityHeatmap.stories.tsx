import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { AppStatsSnapshot } from '@shiroani/shared';
import { mockAppStatsSnapshot } from '../profile-fixtures';
import ActivityHeatmap from './ActivityHeatmap';

const EMPTY_SNAPSHOT: AppStatsSnapshot = {
  ...mockAppStatsSnapshot,
  byDay: {},
  totals: { appOpenSeconds: 0, appActiveSeconds: 0, animeWatchSeconds: 0, sessionCount: 0 },
};

/**
 * GitHub-contributions-style heatmap of the last `weeks` of activity. Each day
 * is a flat tinted `role="gridcell"` carrying a localized `aria-label` (date +
 * value) and a hover tooltip; the grid carries a summarising `aria-label`. The
 * cell colour intensity is bucketed from the day's seconds against the window's
 * maximum.
 */
const meta = {
  title: 'profile/ActivityHeatmap',
  component: ActivityHeatmap,
  parameters: {
    // Grid + per-cell aria-labels + decorative axes (aria-hidden) — axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    snapshot: { description: 'App-stats snapshot; its `byDay` buckets fill the cells.' },
    weeks: { control: { type: 'number' }, description: 'Trailing weeks to render (default 12).' },
    metric: {
      control: { type: 'inline-radio' },
      options: ['active', 'anime'],
      description: 'Which counter drives the colour intensity.',
    },
  },
} satisfies Meta<typeof ActivityHeatmap>;

export default meta;

type Story = StoryObj<typeof ActivityHeatmap>;

/** Active-time metric across 12 weeks — 84 day cells with seeded buckets. */
export const Default: Story = {
  args: { snapshot: mockAppStatsSnapshot, weeks: 12, metric: 'active' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('grid')).toBeInTheDocument();
    // 12 weeks × 7 days = 84 day cells, each with an accessible label.
    await expect(canvas.getAllByRole('gridcell')).toHaveLength(84);
  },
};

/** Anime-watch metric — colours intensity from `animeWatchSeconds` instead. */
export const AnimeMetric: Story = {
  args: { snapshot: mockAppStatsSnapshot, weeks: 12, metric: 'anime' },
};

/** A shorter window renders fewer cells (4 weeks × 7 = 28). */
export const FourWeeks: Story = {
  args: { snapshot: mockAppStatsSnapshot, weeks: 4, metric: 'active' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('gridcell')).toHaveLength(28);
  },
};

/** Empty snapshot — the grid still renders every cell as a "no activity" day. */
export const NoActivity: Story = {
  args: { snapshot: EMPTY_SNAPSHOT, weeks: 12, metric: 'active' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('gridcell')).toHaveLength(84);
    // Every non-future day with no data is labelled "no activity".
    const empties = canvas.getAllByLabelText(/no activity/i);
    await expect(empties.length).toBeGreaterThan(0);
  },
};
