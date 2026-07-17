import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AiringAnime } from '@shiroani/shared';
import AiringEntry from './AiringEntry';

const anime = {
  id: 1,
  airingAt: 1717003600,
  episode: 5,
  media: {
    id: 1,
    title: { romaji: 'Frieren' },
    coverImage: { medium: 'https://placehold.co/42x56' },
    episodes: 28,
    status: 'RELEASING',
    genres: [],
    format: 'TV',
  },
} as unknown as AiringAnime;

/**
 * A single airing slot rendered as a horizontal pill card: status stripe, time
 * block, cover thumb, title + format/episode meta, and a right cluster with the
 * countdown / live pill plus the subscribe bell. `status` and the `now` clock
 * decide the live / soon / watched treatment; `onClick` makes the whole row a
 * keyboard-activatable button.
 */
const meta = {
  title: 'schedule/AiringEntry',
  component: AiringEntry,
  parameters: {
    // Row carries an aria-label, the bell button is named, the cover is
    // decorative (empty alt) — axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    status: {
      control: 'inline-radio',
      options: ['soon', 'live', 'done'],
      description: 'Slot status relative to `now` — drives stripe colour and pill copy.',
    },
    now: {
      control: 'number',
      description: 'Current unix seconds — shared clock tick for the row.',
    },
    onClick: { description: 'Opens the detail dialog; makes the row a keyboard button.' },
  },
  args: { anime, now: 1717000000 },
} satisfies Meta<typeof AiringEntry>;

export default meta;

type Story = StoryObj<typeof AiringEntry>;

/** Upcoming slot — shows the compact "T-…" countdown pill. */
export const Soon: Story = {
  args: { status: 'soon' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Frieren')).toBeInTheDocument();
    // 1717003600 − 1717000000 = 3600s = 1h out → "T-1h".
    await expect(canvas.getByText('T-1h')).toBeInTheDocument();
  },
};

/** Live slot — accent stripe plus the LIVE badge and watch affordance. */
export const Live: Story = {
  args: { status: 'live' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('LIVE')).toBeInTheDocument();
    await expect(canvas.getByText('Watch')).toBeInTheDocument();
  },
};

/** Watched slot — dimmed, with the "Watched" pill. */
export const Watched: Story = {
  args: { status: 'done' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Watched')).toBeInTheDocument();
  },
};

/**
 * Clickable row — the whole entry is a keyboard-activatable button that opens
 * the detail dialog. Clicking it fires `onClick` with the entry.
 */
export const Clickable: Story = {
  args: { status: 'soon', onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole('button', { name: /Frieren/ });
    await userEvent.click(row);
    await waitFor(() => expect(args.onClick).toHaveBeenCalledWith(anime));
  },
};
