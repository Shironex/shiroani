import type { Meta, StoryObj } from '@storybook/react-vite';
import type { UserProfile } from '@shiroani/shared';
import GenreBreakdown from './GenreBreakdown';

type Genres = UserProfile['statistics']['genres'];

const genres = [
  { name: 'Action', count: 120 },
  { name: 'Drama', count: 86 },
  { name: 'Comedy', count: 64 },
  { name: 'Romance', count: 40 },
  { name: 'Fantasy', count: 22 },
] as unknown as Genres;

const meta = {
  title: 'profile/GenreBreakdown',
  component: GenreBreakdown,
} satisfies Meta<typeof GenreBreakdown>;

export default meta;

type Story = StoryObj<typeof GenreBreakdown>;

export const Default: Story = {
  args: { genres },
};

export const Empty: Story = {
  args: { genres: [] },
};
