import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
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

/**
 * Listbox popup half of the address-bar combobox (WAI-ARIA combobox pattern):
 * a labelled `role="listbox"` of `option` rows, each with a source icon
 * (history / bookmark / frequent), title and monospace URL. The owning input
 * holds `role="combobox"` and `aria-activedescendant`; the active row is marked
 * `aria-selected`. Selecting commits on mousedown so the input doesn't blur
 * first. Shown in isolation here over the dark chrome.
 */
const meta = {
  title: 'browser/AddressSuggestions',
  component: AddressSuggestions,
  parameters: {
    // The listbox is labelled and its options carry names + aria-selected, so
    // axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    listboxId: { control: 'text', description: 'Element id the combobox input points at.' },
    activeIndex: {
      control: { type: 'number' },
      description: 'Index of the keyboard-active option, or -1 when none.',
    },
    onHoverIndex: { description: 'Called with a row index when it is hovered.' },
    onSelect: { description: 'Called with a row url when it is committed.' },
  },
  args: {
    listboxId: 'browser-address-suggestions',
    suggestions,
    activeIndex: 0,
    onHoverIndex: fn(),
    onSelect: fn(),
  },
} satisfies Meta<typeof AddressSuggestions>;

export default meta;

type Story = StoryObj<typeof AddressSuggestions>;

/** Two suggestions, the first keyboard-active; selecting commits its url. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('listbox', { name: 'Address suggestions' })).toBeInTheDocument();
    await expect(canvas.getByRole('option', { name: /Shinden/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await userEvent.click(canvas.getByRole('option', { name: /YouTube/ }));
    await expect(args.onSelect).toHaveBeenCalledWith('https://youtube.com');
  },
};
