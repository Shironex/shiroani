import type { Meta, StoryObj } from '@storybook/react-vite';
import SplashHero from './SplashHero';

/**
 * Centerpiece of the splash overlay — the mascot inside a counter-rotating
 * SpinnerRing, the ShiroAni wordmark, and a per-variant subtitle. The `loading`
 * variant waves and pulses; `updating` swaps to the sleeping mascot with an
 * info tone and an optional target-version subtitle; `error` drops the ring,
 * switches to the destructive tone, and adds a reassuring error paragraph (the
 * copy distinguishes a network/offline failure from a generic one). Purely
 * presentational — every variant is derived from props, so these are
 * render-only stories with no interaction.
 */
const meta = {
  title: 'splash/SplashHero',
  component: SplashHero,
  parameters: {
    // Mascot img carries localized alt text; the ring arcs are aria-hidden
    // decorative motion, so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['loading', 'updating', 'error'],
      description:
        '`loading` — waving mascot + spinner; `updating` — sleeping mascot, info tone; `error` — no ring, destructive tone + error paragraph.',
    },
    errorMessage: {
      control: 'text',
      description:
        'Raw failure detail (error variant). Network-looking messages get the offline copy; anything else gets the generic copy.',
    },
    updatingTarget: {
      control: 'text',
      description: 'Incoming version label shown in the subtitle for the updating variant.',
    },
  },
} satisfies Meta<typeof SplashHero>;

export default meta;

type Story = StoryObj<typeof SplashHero>;

/** Default boot state — waving mascot, spinner ring, primary tone. */
export const Loading: Story = { args: { variant: 'loading' } };

/** Mid-update — sleeping mascot, info tone, target version in the subtitle. */
export const Updating: Story = {
  args: { variant: 'updating', updatingTarget: 'v0.6.0' },
};

/** Network failure — no ring, destructive tone, offline reassurance copy. */
export const Error: Story = {
  args: { variant: 'error', errorMessage: 'network unreachable' },
};

/** Non-network failure — falls back to the generic "something went wrong" copy. */
export const GenericError: Story = {
  args: { variant: 'error', errorMessage: 'Unexpected token in module' },
};
