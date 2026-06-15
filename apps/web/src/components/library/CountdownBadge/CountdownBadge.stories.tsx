import type { Meta, StoryObj } from '@storybook/react-vite';
import CountdownBadge from './CountdownBadge';

/**
 * Small badge counting down to an episode's airing time. Shows a "soon" label
 * inside the final 15 minutes, an "Ep. N in <time>" label further out, and
 * renders nothing once the episode has aired. All instances share one timer.
 */
const meta = {
  title: 'library/CountdownBadge',
  component: CountdownBadge,
  parameters: {
    // Plain Badge text; no interactive elements or icons.
    a11y: { test: 'error' },
  },
  argTypes: {
    airingAt: {
      description: 'Unix epoch seconds when the episode airs; past values hide the badge.',
    },
    episode: { description: 'Episode number interpolated into the countdown label.' },
  },
} satisfies Meta<typeof CountdownBadge>;

export default meta;

type Story = StoryObj<typeof CountdownBadge>;

const HOUR = 3600;

/** Airs in ~3h — renders the full "episode in countdown" label. */
export const Upcoming: Story = {
  args: { airingAt: Math.floor(Date.now() / 1000) + 3 * HOUR, episode: 5 },
};

/** Airs in under 15 minutes — renders the "soon" label. */
export const Soon: Story = {
  args: { airingAt: Math.floor(Date.now() / 1000) + 5 * 60, episode: 5 },
};
