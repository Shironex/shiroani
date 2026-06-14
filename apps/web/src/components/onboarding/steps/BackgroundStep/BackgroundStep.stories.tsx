import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import BackgroundStep from './BackgroundStep';

const meta = {
  title: 'onboarding/steps/BackgroundStep',
  component: BackgroundStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof BackgroundStep>;

export default meta;

type Story = StoryObj<typeof BackgroundStep>;

export const Default: Story = {};
