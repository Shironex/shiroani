import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import DiscoverSortSelect from './DiscoverSortSelect';

/**
 * Sort selector for the browse tabs and search results. Wraps the shared Select
 * primitive: the trigger is a labelled `combobox` showing the active mode, and
 * its options (score, popularity, release date, title) live in a listbox that
 * portals to the document body. axe runs clean — the trigger carries an
 * accessible name.
 */
const meta = {
  title: 'discover/DiscoverSortSelect',
  component: DiscoverSortSelect,
  parameters: { a11y: { test: 'error' } },
  args: { value: 'score', onChange: fn() },
  argTypes: {
    value: {
      control: 'select',
      options: ['score', 'popularity', 'releaseDate', 'title'],
      description: 'The active sort mode.',
    },
    onChange: { description: 'Called with the next sort mode when an option is chosen.' },
    disabled: { control: 'boolean', description: 'Disables the trigger while a fetch is loading.' },
  },
} satisfies Meta<typeof DiscoverSortSelect>;

export default meta;

type Story = StoryObj<typeof DiscoverSortSelect>;

/** Choosing a different mode from the portalled listbox reports it through onChange. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('combobox', { name: /sort/i }));
    await userEvent.click(await body.findByRole('option', { name: 'Popularity' }));

    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith('popularity'));
  },
};

/** Disabled — the trigger cannot be opened while a fetch is in flight. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox', { name: /sort/i })).toBeDisabled();
  },
};
