import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import SummaryStep from './SummaryStep';

const meta = {
  title: 'onboarding/steps/SummaryStep',
  component: SummaryStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof SummaryStep>;

export default meta;

type Story = StoryObj<typeof SummaryStep>;

export const Default: Story = {};
