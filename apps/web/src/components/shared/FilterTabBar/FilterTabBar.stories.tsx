import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart, Star } from 'lucide-react';
import FilterTabBar from './FilterTabBar';

const meta = {
  title: 'shared/FilterTabBar',
  component: FilterTabBar,
} satisfies Meta<typeof FilterTabBar>;

export default meta;

type Story = StoryObj<typeof FilterTabBar>;

export const Default: Story = {
  args: {
    active: 'all',
    onChange: () => {},
    tabs: [
      { value: 'all', label: 'Wszystkie', Icon: Star },
      { value: 'fav', label: 'Ulubione', Icon: Heart },
    ],
  },
};
