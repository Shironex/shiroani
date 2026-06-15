import type { Meta, StoryObj } from '@storybook/react-vite';
import LatestReleaseHighlights from './LatestReleaseHighlights';

const meta = {
  title: 'settings/updates/LatestReleaseHighlights',
  component: LatestReleaseHighlights,
} satisfies Meta<typeof LatestReleaseHighlights>;

export default meta;

type Story = StoryObj<typeof LatestReleaseHighlights>;

export const Default: Story = {};
