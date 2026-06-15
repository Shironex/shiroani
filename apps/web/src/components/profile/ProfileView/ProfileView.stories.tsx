import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import ProfileView from './ProfileView';

const meta = {
  title: 'profile/ProfileView',
  component: ProfileView,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof ProfileView>;

export default meta;

type Story = StoryObj<typeof ProfileView>;

/**
 * Default mount — outside Electron the auth bridge is absent, so the view
 * resolves to the disconnected state and renders the AniList connect form.
 * Connected dashboards are socket-backed and exercised in integration tests.
 */
export const Default: Story = {};
