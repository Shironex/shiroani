import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import RandomPeekChip from './RandomPeekChip';

const media: DiscoverMedia = {
  id: 1,
  title: { english: 'Frieren: Beyond Journey’s End' },
  coverImage: {
    medium: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
};

const meta = {
  title: 'discover/random/RandomPeekChip',
  component: RandomPeekChip,
} satisfies Meta<typeof RandomPeekChip>;

export default meta;

type Story = StoryObj<typeof RandomPeekChip>;

export const Previous: Story = {
  args: { media, direction: 'prev', onClick: () => {}, inLibrary: false },
};
export const Next: Story = {
  args: { media, direction: 'next', onClick: () => {}, inLibrary: true },
};
