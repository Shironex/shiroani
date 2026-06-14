import type { Meta, StoryObj } from '@storybook/react-vite';
import DiscoverFiltersPanel from './DiscoverFiltersPanel';

const meta = {
  title: 'discover/DiscoverFiltersPanel',
  component: DiscoverFiltersPanel,
} satisfies Meta<typeof DiscoverFiltersPanel>;

export default meta;

type Story = StoryObj<typeof DiscoverFiltersPanel>;

export const Default: Story = {
  args: {
    filters: {},
    disabled: false,
    connected: true,
    onChange: () => {},
  },
};
