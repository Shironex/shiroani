import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AddressSuggestion } from '../useAddressSuggestions';
import AddressSuggestions from './AddressSuggestions';

const suggestions: AddressSuggestion[] = [
  {
    id: 'addr-sug-history-0',
    url: 'https://shinden.pl',
    title: 'Shinden',
    source: 'history',
  },
  {
    id: 'addr-sug-bookmark-1',
    url: 'https://youtube.com',
    title: 'YouTube',
    source: 'bookmark',
  },
];

const meta = {
  title: 'browser/AddressSuggestions',
  component: AddressSuggestions,
} satisfies Meta<typeof AddressSuggestions>;

export default meta;

type Story = StoryObj<typeof AddressSuggestions>;

export const Default: Story = {
  args: {
    listboxId: 'browser-address-suggestions',
    suggestions,
    activeIndex: 0,
    onHoverIndex: () => {},
    onSelect: () => {},
  },
};
