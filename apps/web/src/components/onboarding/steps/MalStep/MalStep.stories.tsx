import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import MalStep from './MalStep';

const meta = {
  title: 'onboarding/steps/MalStep',
  component: MalStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof MalStep>;

export default meta;

type Story = StoryObj<typeof MalStep>;

export const Default: Story = {};
