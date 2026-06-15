import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import ProfileSetup from './ProfileSetup';

const meta = {
  title: 'profile/ProfileSetup',
  component: ProfileSetup,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof ProfileSetup>;

export default meta;

type Story = StoryObj<typeof ProfileSetup>;

/** Default empty form — the store's initial state has no username, no error. */
export const Default: Story = {};
