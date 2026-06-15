import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import DiscoverCard from './DiscoverCard';

const media: DiscoverMedia = {
  id: 1,
  title: { english: 'Frieren: Beyond Journey’s End', romaji: 'Sousou no Frieren' },
  coverImage: {
    large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
  episodes: 28,
  status: 'FINISHED',
  format: 'TV',
  averageScore: 92,
};

/**
 * A single anime poster card for the discover grids. The card itself is a
 * keyboard-operable `role="button"` (labelled by the title) that opens the
 * detail dialog; a hover/focus overlay surfaces an "Add to library" action that
 * stops propagation so it never also opens the dialog. Format pill, score chip
 * and the in-library badge are derived from the media. axe runs clean: the card
 * and add button carry accessible names, the cover has alt text, and every
 * decorative gradient is `aria-hidden`.
 */
const meta = {
  title: 'discover/DiscoverCard',
  component: DiscoverCard,
  parameters: { a11y: { test: 'error' } },
  args: { onClick: fn(), onAddToLibrary: fn() },
  argTypes: {
    media: { description: 'AniList media rendered as the poster, title and badges.' },
    inLibrary: {
      control: 'boolean',
      description: 'Shows the in-library badge and disables the add action.',
    },
    onClick: { description: 'Called with the media when the card is activated.' },
    onAddToLibrary: {
      description: 'Called with the media from the overlay add action; absent → no overlay.',
    },
  },
} satisfies Meta<typeof DiscoverCard>;

export default meta;

type Story = StoryObj<typeof DiscoverCard>;

/** Default card — activating it opens the detail; the add action adds to library. */
export const Default: Story = {
  args: { media },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: media.title.english }));
    await expect(args.onClick).toHaveBeenCalledWith(media);

    // The overlay add action adds without re-triggering the card's open.
    await userEvent.click(canvas.getByRole('button', { name: 'Add to library' }));
    await expect(args.onAddToLibrary).toHaveBeenCalledWith(media);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** Already-added — the add action is disabled and labelled "In library". */
export const InLibrary: Story = {
  args: { media, inLibrary: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const addButton = canvas.getByRole('button', { name: 'In library' });
    await expect(addButton).toBeDisabled();
    await userEvent.click(addButton);
    await expect(args.onAddToLibrary).not.toHaveBeenCalled();
  },
};
