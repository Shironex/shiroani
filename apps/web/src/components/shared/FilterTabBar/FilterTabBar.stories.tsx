import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart, Star } from 'lucide-react';
import { within, userEvent, expect, fn } from 'storybook/test';
import FilterTabBar from './FilterTabBar';

/**
 * Horizontal row of filter pills (a `tablist`). The active tab gets a tinted
 * background and a short primary underline; clicking a tab fires `onChange`
 * with its value. Tabs can carry an optional decorative icon.
 */
const meta = {
  title: 'shared/FilterTabBar',
  component: FilterTabBar,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    tabs: { description: 'Tab descriptors: value, label and optional icon/tooltip.' },
    active: { description: 'The currently selected tab value.' },
    onChange: { description: 'Fired with the value of the clicked tab.' },
    ariaLabel: { description: 'Accessible name for the tablist container.' },
  },
} satisfies Meta<typeof FilterTabBar>;

export default meta;

type Story = StoryObj<typeof FilterTabBar>;

export const Default: Story = {
  args: {
    active: 'all',
    onChange: fn(),
    ariaLabel: 'Filtry',
    tabs: [
      { value: 'all', label: 'Wszystkie', Icon: Star },
      { value: 'fav', label: 'Ulubione', Icon: Heart },
    ],
  },
};

export const WithoutIcons: Story = {
  args: {
    active: 'fav',
    onChange: fn(),
    ariaLabel: 'Filtry',
    tabs: [
      { value: 'all', label: 'Wszystkie' },
      { value: 'fav', label: 'Ulubione' },
      { value: 'archived', label: 'Zarchiwizowane' },
    ],
  },
};

export const SelectsTab: Story = {
  args: {
    active: 'all',
    onChange: fn(),
    ariaLabel: 'Filtry',
    tabs: [
      { value: 'all', label: 'Wszystkie', Icon: Star },
      { value: 'fav', label: 'Ulubione', Icon: Heart },
    ],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('tab', { name: 'Ulubione' }));
    await expect(args.onChange).toHaveBeenCalledWith('fav');
  },
};
