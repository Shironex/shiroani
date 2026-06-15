import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart } from 'lucide-react';
import ViewHeader from './ViewHeader';

const meta = {
  title: 'shared/ViewHeader',
  component: ViewHeader,
} satisfies Meta<typeof ViewHeader>;

export default meta;

type Story = StoryObj<typeof ViewHeader>;

export const TitleOnly: Story = {
  args: { icon: Heart, title: 'Moja lista', subtitle: 'Biblioteka' },
};

export const WithSearchAndFilters: Story = {
  args: {
    icon: Heart,
    title: 'Moja lista',
    searchQuery: '',
    onSearchChange: () => {},
    filters: [
      { value: 'all', label: 'Wszystkie' },
      { value: 'fav', label: 'Ulubione' },
    ],
    activeFilter: 'all',
    onFilterChange: () => {},
  },
};
