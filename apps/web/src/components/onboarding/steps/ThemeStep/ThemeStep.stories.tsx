import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import ThemeStep from './ThemeStep';

const meta = {
  title: 'onboarding/steps/ThemeStep',
  component: ThemeStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof ThemeStep>;

export default meta;

type Story = StoryObj<typeof ThemeStep>;

export const Default: Story = {};
