import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import AnimeInfoHeader from './AnimeInfoHeader';

/**
 * Banner header for the detail dialog: a blurred banner / cover backdrop, the
 * cover thumbnail, the title block (with optional English + native titles), and
 * a subscribe bell. The bell carries an accessible name and `aria-pressed` that
 * track the subscription state; clicking it fires `onToggleSubscribe`.
 */
const meta = {
  title: 'schedule/anime-info/AnimeInfoHeader',
  component: AnimeInfoHeader,
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    isSubscribed: {
      control: 'boolean',
      description: 'Flips the bell glyph + tooltip and the button aria-pressed.',
    },
    onToggleSubscribe: { description: 'Called when the bell is clicked.' },
  },
  args: {
    title: 'Frieren: Beyond Journey’s End',
    details: null,
    coverUrl: 'https://placehold.co/200x280',
    bannerUrl: 'https://placehold.co/800x300',
    accentColor: '#7c6f9c',
    onToggleSubscribe: fn(),
  },
} satisfies Meta<typeof AnimeInfoHeader>;

export default meta;

type Story = StoryObj<typeof AnimeInfoHeader>;

/** Not subscribed — outline bell; clicking it calls `onToggleSubscribe`. */
export const Default: Story = {
  args: { isSubscribed: false },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Frieren: Beyond Journey’s End')).toBeInTheDocument();
    const bell = canvas.getByRole('button', { name: 'Enable notifications' });
    await expect(bell).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(bell);
    await waitFor(() => expect(args.onToggleSubscribe).toHaveBeenCalled());
  },
};

/** Subscribed — filled bell, aria-pressed true, "disable" copy. */
export const Subscribed: Story = {
  args: { isSubscribed: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Disable notifications' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  },
};
