import type { Meta, StoryObj } from '@storybook/react-vite';
import CountdownBadge from './CountdownBadge';

const meta = {
  title: 'library/CountdownBadge',
  component: CountdownBadge,
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
