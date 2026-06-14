import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import DiscordStep from './DiscordStep';

const meta = {
  title: 'onboarding/steps/DiscordStep',
  component: DiscordStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof DiscordStep>;

export default meta;

type Story = StoryObj<typeof DiscordStep>;

export const Default: Story = {};
