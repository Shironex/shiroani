import type { Meta, StoryObj } from '@storybook/react-vite';
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

const meta = {
  title: 'discover/DiscoverCard',
  component: DiscoverCard,
} satisfies Meta<typeof DiscoverCard>;

export default meta;

type Story = StoryObj<typeof DiscoverCard>;

export const Default: Story = { args: { media, onAddToLibrary: () => {} } };
export const InLibrary: Story = { args: { media, inLibrary: true, onAddToLibrary: () => {} } };
