import type { Meta, StoryObj } from '@storybook/react-vite';
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

const meta = {
  title: 'discover/random/RandomShowcaseCard',
  component: RandomShowcaseCard,
} satisfies Meta<typeof RandomShowcaseCard>;

export default meta;

type Story = StoryObj<typeof RandomShowcaseCard>;

export const Default: Story = {
  args: {
    media,
    index: 0,
    total: 12,
    inLibrary: false,
    isLoading: false,
    onPrev: () => {},
    onNext: () => {},
    onRefetch: () => {},
    onOpenDetails: () => {},
    onAddToLibrary: () => {},
  },
};
