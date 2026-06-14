import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import NameStep from './NameStep';

const meta = {
  title: 'onboarding/steps/NameStep',
  component: NameStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof NameStep>;

export default meta;

type Story = StoryObj<typeof NameStep>;

export const Default: Story = {};
