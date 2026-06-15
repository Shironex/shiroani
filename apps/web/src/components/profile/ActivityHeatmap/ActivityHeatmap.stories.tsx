import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockAppStatsSnapshot } from '../profile-fixtures';
import ActivityHeatmap from './ActivityHeatmap';

const meta = {
  title: 'profile/ActivityHeatmap',
  component: ActivityHeatmap,
} satisfies Meta<typeof ActivityHeatmap>;

export default meta;

type Story = StoryObj<typeof ActivityHeatmap>;

export const Default: Story = {
  args: { snapshot: mockAppStatsSnapshot, weeks: 12, metric: 'active' },
};

export const AnimeMetric: Story = {
  args: { snapshot: mockAppStatsSnapshot, weeks: 12, metric: 'anime' },
};
