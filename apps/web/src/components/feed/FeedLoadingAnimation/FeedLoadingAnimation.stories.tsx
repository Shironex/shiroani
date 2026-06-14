import type { Meta, StoryObj } from '@storybook/react-vite';
import FeedLoadingAnimation from './FeedLoadingAnimation';

const meta = {
  title: 'feed/FeedLoadingAnimation',
  component: FeedLoadingAnimation,
} satisfies Meta<typeof FeedLoadingAnimation>;

export default meta;

type Story = StoryObj<typeof FeedLoadingAnimation>;

export const Default: Story = {};
