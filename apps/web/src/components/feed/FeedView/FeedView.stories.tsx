import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import FeedView from './FeedView';

const meta = {
  title: 'feed/FeedView',
  component: FeedView,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof FeedView>;

export default meta;

type Story = StoryObj<typeof FeedView>;

export const Default: Story = {};
