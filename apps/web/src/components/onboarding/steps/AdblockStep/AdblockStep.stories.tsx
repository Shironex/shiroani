import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import AdblockStep from './AdblockStep';

const meta = {
  title: 'onboarding/steps/AdblockStep',
  component: AdblockStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof AdblockStep>;

export default meta;

type Story = StoryObj<typeof AdblockStep>;

export const Default: Story = {};
