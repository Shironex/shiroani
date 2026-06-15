import type { Meta, StoryObj } from '@storybook/react-vite';
import AniListErrorState from './AniListErrorState';

const meta = {
  title: 'shared/AniListErrorState',
  component: AniListErrorState,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AniListErrorState>;

export default meta;

type Story = StoryObj<typeof AniListErrorState>;

export const Network: Story = {
  args: { error: 'Failed to fetch', onRetry: () => {} },
};
