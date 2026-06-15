import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { ThemeOption } from '@/lib/theme';
import ThemeSwatch from './ThemeSwatch';

const option: ThemeOption = {
  value: 'sakura' as ThemeOption['value'],
  label: 'Sakura',
  color: 'oklch(0.72 0.15 355)',
  isDark: true,
  testId: 'theme-sakura',
};

/**
 * A single selectable theme tile, rendered as a `<button>` with a gradient
 * preview of the theme's primary color and its name baked along the bottom.
 * Clicking fires `onSelect(value)`; hover/focus fire `onPreview` and unhover/blur
 * fire `onPreviewEnd` for live theming. The active tile shows a check badge and
 * `aria-pressed`. Its accessible name is the theme label.
 */
const meta = {
  title: 'shared/theme/ThemeSwatch',
  component: ThemeSwatch,
  parameters: {
    // Structural a11y is solid (button role, aria-label from the theme name,
    // aria-pressed for selection) and the baked label clears axe color-contrast
    // thanks to its text-shadow + high-opacity color, so we enforce at 'error'.
    a11y: { test: 'error' },
  },
  argTypes: {
    option: { description: 'Theme descriptor (value, label, color, isDark, testId).' },
    isActive: {
      description: 'Whether this is the currently selected theme (shows the check + ring).',
    },
    onSelect: { description: 'Fired with the theme value when the swatch is clicked.' },
    onPreview: { description: 'Fired with the theme value on hover/focus for live preview.' },
    onPreviewEnd: { description: 'Fired on unhover/blur to end the live preview.' },
  },
} satisfies Meta<typeof ThemeSwatch>;

export default meta;

type Story = StoryObj<typeof ThemeSwatch>;

export const Active: Story = {
  args: {
    option,
    isActive: true,
    onSelect: fn(),
    onPreview: fn(),
    onPreviewEnd: fn(),
  },
};

export const Inactive: Story = {
  args: {
    option,
    isActive: false,
    onSelect: fn(),
    onPreview: fn(),
    onPreviewEnd: fn(),
  },
};

export const SelectsOnClick: Story = {
  args: {
    option,
    isActive: false,
    onSelect: fn(),
    onPreview: fn(),
    onPreviewEnd: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sakura' }));
    await expect(args.onSelect).toHaveBeenCalledWith('sakura');
  },
};
