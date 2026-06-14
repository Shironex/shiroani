import type { Meta, StoryObj } from '@storybook/react-vite';
import DiscoverSortSelect from './DiscoverSortSelect';

const meta = {
  title: 'discover/DiscoverSortSelect',
  component: DiscoverSortSelect,
} satisfies Meta<typeof DiscoverSortSelect>;

export default meta;

type Story = StoryObj<typeof DiscoverSortSelect>;

export const Default: Story = {
  args: {
    value: 'score',
    onChange: () => {},
  },
};
