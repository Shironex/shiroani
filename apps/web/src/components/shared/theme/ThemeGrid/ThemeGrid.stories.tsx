import type { Meta, StoryObj } from '@storybook/react-vite';
import { Moon } from 'lucide-react';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { ThemeOption } from '@/lib/theme';
import ThemeGrid from './ThemeGrid';

const themes: ThemeOption[] = [
  {
    value: 'plum' as ThemeOption['value'],
    label: 'Plum',
    color: 'oklch(0.6 0.18 320)',
    isDark: true,
    testId: 't-plum',
  },
  {
    value: 'sakura' as ThemeOption['value'],
    label: 'Sakura',
    color: 'oklch(0.72 0.15 355)',
    isDark: true,
    testId: 't-sakura',
  },
  {
    value: 'paper' as ThemeOption['value'],
    label: 'Paper',
    color: 'oklch(0.5 0.08 80)',
    isDark: false,
    testId: 't-paper',
  },
];

/**
 * A 5-column grid of selectable `ThemeSwatch` tiles under a mono editorial
 * header (icon + label + count). Clicking a swatch fires `onSelect(value)`; the
 * tile matching `activeTheme` shows as pressed. An optional `trailingOverlay`
 * renders hover-reveal chrome per tile (e.g. a clone affordance) and `action`
 * fills the header's trailing slot.
 */
const meta = {
  title: 'shared/theme/ThemeGrid',
  component: ThemeGrid,
  parameters: {
    // Swatches expose proper button roles, aria-labels and aria-pressed, and the
    // baked labels clear axe color-contrast (text-shadow + high-opacity color),
    // so the grid enforces a11y at 'error'.
    a11y: { test: 'error' },
  },
  argTypes: {
    themes: { description: 'The theme options to render as swatches.' },
    label: { description: 'Section header text (e.g. "Dark").' },
    icon: { description: 'Optional Lucide icon shown before the label.' },
    activeTheme: {
      description: 'Currently selected theme value (renders that swatch as pressed).',
    },
    onSelect: { description: 'Fired with the value of the clicked swatch.' },
    onPreview: { description: 'Fired with a theme value on swatch hover/focus.' },
    onPreviewEnd: { description: 'Fired on swatch unhover/blur.' },
    action: { description: 'Optional trailing content in the header row.' },
    trailingOverlay: { description: 'Optional per-swatch hover-reveal overlay renderer.' },
  },
} satisfies Meta<typeof ThemeGrid>;

export default meta;

type Story = StoryObj<typeof ThemeGrid>;

export const Default: Story = {
  args: {
    themes,
    label: 'Dark',
    icon: Moon,
    activeTheme: 'plum',
    onSelect: fn(),
    onPreview: fn(),
    onPreviewEnd: fn(),
  },
};

export const SelectsSwatch: Story = {
  args: {
    themes,
    label: 'Dark',
    activeTheme: 'plum',
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
