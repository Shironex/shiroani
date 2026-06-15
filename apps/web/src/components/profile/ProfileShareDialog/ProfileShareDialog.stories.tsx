import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockUserProfile } from '../profile-fixtures';
import ProfileShareDialog from './ProfileShareDialog';

const meta = {
  title: 'profile/ProfileShareDialog',
  component: ProfileShareDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    profile: mockUserProfile,
  },
} satisfies Meta<typeof ProfileShareDialog>;

export default meta;

type Story = StoryObj<typeof ProfileShareDialog>;

/** Open dialog — renders the share-card preview on a real canvas in the browser. */
export const Open: Story = {};
