import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import StepLayout from './StepLayout';

const meta = {
  title: 'onboarding/StepLayout',
  component: StepLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof StepLayout>;

export default meta;

type Story = StoryObj<typeof StepLayout>;

export const Default: Story = {
  args: {
    kanji: '設定',
    headline: 'Make ShiroAni yours',
    description: 'A quick, friendly tour to set the essentials before you dive in.',
    stepMarker: 'Step 01 · Setup · basics',
    stepTitle: 'Get started',
    stepHint: 'You can change any of this later in Settings.',
    children: (
      <div className="rounded-xl border border-border-glass bg-card/40 p-4 text-sm text-muted-foreground">
        The interactive form card for this step renders here.
      </div>
    ),
  },
};
