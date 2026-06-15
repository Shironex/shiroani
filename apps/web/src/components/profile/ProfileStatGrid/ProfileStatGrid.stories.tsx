import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockUserProfile } from '../profile-fixtures';
import ProfileStatGrid from './ProfileStatGrid';

const meta = {
  title: 'profile/ProfileStatGrid',
  component: ProfileStatGrid,
} satisfies Meta<typeof ProfileStatGrid>;

export default meta;

type Story = StoryObj<typeof ProfileStatGrid>;

export const Default: Story = {
  args: { profile: mockUserProfile },
};
