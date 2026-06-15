import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import ProfileSkeleton from './ProfileSkeleton';

const meta = {
  title: 'profile/ProfileSkeleton',
  component: ProfileSkeleton,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof ProfileSkeleton>;

export default meta;

type Story = StoryObj<typeof ProfileSkeleton>;

export const Default: Story = {};
