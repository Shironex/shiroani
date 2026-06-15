import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import DiscoverFiltersPanel from './DiscoverFiltersPanel';

/**
 * Advanced browse/search filters — a collapsible panel of facet Selects (status,
 * format, season, year), a score-range slider, the reused tri-state GenrePicker,
 * a free-form tag input, and a connection-gated "haven't seen" toggle. Each
 * facet Select trigger is a labelled `combobox` whose listbox portals to the
 * document body. axe runs clean: every control carries an accessible name and
 * the disclosure buttons expose `aria-expanded`.
 */
const meta = {
  title: 'discover/DiscoverFiltersPanel',
  component: DiscoverFiltersPanel,
  parameters: { a11y: { test: 'error' } },
  args: { filters: {}, disabled: false, connected: true, onChange: fn() },
  argTypes: {
    filters: { description: 'Current applied discover filters.' },
    disabled: {
      control: 'boolean',
      description: 'Disables every control while a fetch is loading.',
    },
    connected: {
      control: 'boolean',
      description: 'AniList connection — gates the "haven\'t seen" toggle.',
    },
    onChange: { description: 'Called with the next filters whenever a facet changes.' },
  },
} satisfies Meta<typeof DiscoverFiltersPanel>;

export default meta;

type Story = StoryObj<typeof DiscoverFiltersPanel>;

/** Collapsed — only the header with its expand affordance is shown. */
export const Collapsed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Filters')).toBeInTheDocument();
    // Facet controls stay hidden until expanded.
    await expect(canvas.queryByText('Score range')).not.toBeInTheDocument();
  },
};

/** Expanding the panel reveals the facet controls and a value chosen from a portalled Select. */
export const PickStatus: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByText('Filters'));
    await expect(canvas.getByText('Score range')).toBeInTheDocument();

    // The Airing-status facet trigger is a labelled combobox; its listbox
    // portals to the document body.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Airing status' }));
    const option = await body.findByRole('option', { name: 'Releasing' });
    await userEvent.click(option);

    await waitFor(() =>
      expect(args.onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'RELEASING' }))
    );
  },
};

/** Pre-applied filters surface the active-count badge and the reset action. */
export const WithActiveFilters: Story = {
  args: { filters: { status: 'RELEASING', tags: ['isekai'] } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Active: 2')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }));
    await expect(args.onChange).toHaveBeenCalledWith({});
  },
};

/** Adding a tag — typing then Enter forwards a new tag through onChange. */
export const AddTag: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Filters'));

    const input = canvas.getByPlaceholderText('Add tag...');
    await userEvent.type(input, 'isekai{Enter}');

    await waitFor(() =>
      expect(args.onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['isekai'] }))
    );
  },
};
