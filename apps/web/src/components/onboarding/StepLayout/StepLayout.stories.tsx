import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import StepLayout from './StepLayout';

/**
 * Shared two-pane "magazine split" layout behind every onboarding step. The left
 * pane carries Shiro-chan's narrative (kanji watermark, serif headline, body
 * copy); the right pane hosts the step marker, an `h2` title (with optional
 * icon + hint) and the interactive form card. It is purely presentational — all
 * state lives in the step that composes it.
 */
const meta = {
  title: 'onboarding/StepLayout',
  component: StepLayout,
  parameters: {
    layout: 'fullscreen',
    // The decorative KanjiWatermark behind the left pane is excluded from the
    // axe scan globally (data-a11y-decorative), so axe runs clean as an error.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  argTypes: {
    kanji: { description: 'Single kanji rendered as a faint watermark behind the left pane.' },
    headline: {
      description: 'Left-pane headline (serif). Accepts JSX so words can be italicised via <em>.',
    },
    description: { description: 'Supporting paragraph under the headline.' },
    stepMarker: { description: 'Right-pane eyebrow label, e.g. "Step 02 · Appearance · palette".' },
    stepTitle: { description: 'Right-pane h2 title, rendered beside the optional icon.' },
    stepIcon: { description: 'Optional glyph shown before the step title.' },
    stepHint: { description: 'Optional hint paragraph under the step title.' },
    rightClassName: { description: 'Extra classes for the right-pane scroll container.' },
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Make ShiroAni yours' })
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('heading', { level: 2, name: 'Get started' })
    ).toBeInTheDocument();
    await expect(canvas.getByText('Step 01 · Setup · basics')).toBeInTheDocument();
  },
};
