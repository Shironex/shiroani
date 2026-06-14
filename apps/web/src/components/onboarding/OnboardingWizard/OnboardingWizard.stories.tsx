import type { Meta, StoryObj } from '@storybook/react-vite';
import OnboardingWizard from './OnboardingWizard';

const meta = {
  title: 'onboarding/OnboardingWizard',
  component: OnboardingWizard,
  parameters: { layout: 'fullscreen' },
  args: { onComplete: () => undefined },
} satisfies Meta<typeof OnboardingWizard>;

export default meta;

type Story = StoryObj<typeof OnboardingWizard>;

// The wizard is `fixed inset-0`, so it covers the canvas on its own. Steps read
// their Zustand stores at default (disconnected) state — no backend needed.
export const Default: Story = {};
