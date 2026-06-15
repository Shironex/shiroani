import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import { mockUserProfile } from '../profile-fixtures';
import ProfileDashboard from './ProfileDashboard';

const meta = {
  title: 'profile/ProfileDashboard',
  component: ProfileDashboard,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
  args: {
    profile: mockUserProfile,
    onShare: () => {},
    onRefresh: () => {},
    onDisconnect: () => {},
  },
} satisfies Meta<typeof ProfileDashboard>;

export default meta;

type Story = StoryObj<typeof ProfileDashboard>;

export const Default: Story = {};
