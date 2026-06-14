import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import AniListStep from './AniListStep';

const meta = {
  title: 'onboarding/steps/AniListStep',
  component: AniListStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof AniListStep>;

export default meta;

type Story = StoryObj<typeof AniListStep>;

export const Default: Story = {};
