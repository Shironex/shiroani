import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import DockStep from './DockStep';

const meta = {
  title: 'onboarding/steps/DockStep',
  component: DockStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof DockStep>;

export default meta;

type Story = StoryObj<typeof DockStep>;

export const Default: Story = {};
