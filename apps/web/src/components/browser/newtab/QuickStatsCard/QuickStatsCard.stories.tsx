import type { Meta, StoryObj } from '@storybook/react-vite';
import QuickStatsCard from './QuickStatsCard';

const meta = {
  title: 'browser/newtab/QuickStatsCard',
  component: QuickStatsCard,
} satisfies Meta<typeof QuickStatsCard>;

export default meta;

type Story = StoryObj<typeof QuickStatsCard>;

export const Default: Story = {};
