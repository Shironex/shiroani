import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart } from 'lucide-react';
import { within, userEvent, expect, fn } from 'storybook/test';
import ViewHeader from './ViewHeader';

/**
 * Shell-aligned header used at the top of every main view: an icon tile, a bold
 * title with an optional mono subtitle, a right-side action cluster, and an
 * optional second row with a search box, filter tabs, and grid/list view-mode
 * toggles. The second row is skipped entirely when neither search nor filters
 * are configured, so title-only views (Settings, Profile) stay consistent.
 */
const meta = {
  title: 'shared/ViewHeader',
  component: ViewHeader,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    icon: { description: 'Lucide icon shown in the 36×36 tile.' },
    title: { description: 'Bold view title.' },
    subtitle: { description: 'Optional mono uppercase eyebrow under the title.' },
    actions: { description: 'Right-aligned action nodes (sort, import/export, etc.).' },
    searchQuery: { description: 'Controlled search value; omit `onSearchChange` to hide search.' },
    onSearchChange: { description: 'Fired with the new query; presence enables the search box.' },
    searchPlaceholder: { description: 'Overrides the localized default placeholder.' },
    filters: { description: 'Filter-tab descriptors; an empty/absent list hides the tab row.' },
    activeFilter: { description: 'Currently selected filter value.' },
    onFilterChange: { description: 'Fired with the value of the clicked filter tab.' },
    viewMode: { control: 'inline-radio', options: ['grid', 'list'], description: 'Active layout.' },
    onViewModeChange: {
      description: 'Fired with the next view mode; presence enables the toggles.',
    },
  },
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
    onSearchChange: fn(),
    filters: [
      { value: 'all', label: 'Wszystkie' },
      { value: 'fav', label: 'Ulubione' },
    ],
    activeFilter: 'all',
    onFilterChange: fn(),
  },
};

export const WithViewModeToggles: Story = {
  args: {
    icon: Heart,
    title: 'Moja lista',
    viewMode: 'grid',
    onViewModeChange: fn(),
  },
};

export const SelectsFilter: Story = {
  args: {
    icon: Heart,
    title: 'Moja lista',
    searchQuery: '',
    onSearchChange: fn(),
    filters: [
      { value: 'all', label: 'Wszystkie' },
      { value: 'fav', label: 'Ulubione' },
    ],
    activeFilter: 'all',
    onFilterChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('tab', { name: 'Ulubione' }));
    await expect(args.onFilterChange).toHaveBeenCalledWith('fav');
  },
};

export const TypesInSearch: Story = {
  args: {
    icon: Heart,
    title: 'Moja lista',
    searchQuery: '',
    onSearchChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox'), 'Frieren');
    await expect(args.onSearchChange).toHaveBeenCalled();
  },
};

export const TogglesViewMode: Story = {
  args: {
    icon: Heart,
    title: 'Moja lista',
    viewMode: 'grid',
    onViewModeChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'List view' }));
    await expect(args.onViewModeChange).toHaveBeenCalledWith('list');
  },
};
