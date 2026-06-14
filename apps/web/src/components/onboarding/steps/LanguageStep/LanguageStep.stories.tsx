import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../../.storybook/decorators';
import LanguageStep from './LanguageStep';

const meta = {
  title: 'onboarding/steps/LanguageStep',
  component: LanguageStep,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof LanguageStep>;

export default meta;

type Story = StoryObj<typeof LanguageStep>;

export const Default: Story = {};
