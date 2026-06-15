import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import RandomShowcaseCard from './RandomShowcaseCard';

const media: DiscoverMedia = {
  id: 1,
  title: { english: 'Frieren: Beyond Journey’s End', romaji: 'Sousou no Frieren' },
  coverImage: {
    extraLarge: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx154587.jpg',
    medium: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
  episodes: 28,
  status: 'FINISHED',
  format: 'TV',
  season: 'FALL',
  seasonYear: 2023,
  genres: ['Adventure', 'Drama', 'Fantasy'],
  averageScore: 92,
  description: 'An elf mage reflects on her decades-long journey.',
};

/**
 * Hero showcase card for the Random tab — an editorial layout with a poster, a
 * big serif title, a meta row, genre chips and a synopsis, plus shuffle /
 * add-to-library / refresh / prev / next actions. The poster and every action
 * button carry accessible names and the decorative kanji watermark and overlays
 * are `aria-hidden`, so axe runs clean.
 */
const meta = {
  title: 'discover/random/RandomShowcaseCard',
  component: RandomShowcaseCard,
  parameters: { a11y: { test: 'error' } },
  args: {
    media,
    index: 0,
    total: 12,
    inLibrary: false,
    isLoading: false,
    onPrev: fn(),
    onNext: fn(),
    onRefetch: fn(),
    onOpenDetails: fn(),
    onAddToLibrary: fn(),
  },
  argTypes: {
    media: { description: 'The currently featured pick.' },
    index: { control: 'number', description: 'Zero-based position within the pool.' },
    total: { control: 'number', description: 'Pool size, for the "n / total" indicator.' },
    inLibrary: {
      control: 'boolean',
      description: 'Hides the add action and shows the in-library tag.',
    },
    isLoading: {
      control: 'boolean',
      description: 'Disables shuffle/refresh while a fetch is loading.',
    },
  },
} satisfies Meta<typeof RandomShowcaseCard>;

export default meta;

type Story = StoryObj<typeof RandomShowcaseCard>;

/** Default — shuffling advances the pick and the title opens the detail. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /shuffle/i }));
    await expect(args.onNext).toHaveBeenCalled();

    await userEvent.click(canvas.getByRole('heading', { name: 'Frieren: Beyond Journey’s End' }));
    await expect(args.onOpenDetails).toHaveBeenCalled();

    await userEvent.click(canvas.getByRole('button', { name: 'Add to library' }));
    await expect(args.onAddToLibrary).toHaveBeenCalled();
  },
};

/** Already added — the add action is replaced by the in-library tag. */
export const InLibrary: Story = {
  args: { inLibrary: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Add to library' })).not.toBeInTheDocument();
    await expect(canvas.getByText('In library')).toBeInTheDocument();
  },
};
