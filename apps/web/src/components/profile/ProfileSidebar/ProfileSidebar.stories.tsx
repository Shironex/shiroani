import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockUserProfile } from '../profile-fixtures';
import ProfileSidebar from './ProfileSidebar';

const meta = {
  title: 'profile/ProfileSidebar',
  component: ProfileSidebar,
  args: {
    profile: mockUserProfile,
    isLoading: false,
    onRefresh: () => {},
    onShare: () => {},
    onDisconnect: () => {},
  },
} satisfies Meta<typeof ProfileSidebar>;

export default meta;

type Story = StoryObj<typeof ProfileSidebar>;

export const Default: Story = {};
