import type { Meta, StoryObj } from '@storybook/react-vite';
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

const meta = {
  title: 'shared/theme/ThemeGrid',
  component: ThemeGrid,
} satisfies Meta<typeof ThemeGrid>;

export default meta;

type Story = StoryObj<typeof ThemeGrid>;

export const Default: Story = {
  args: {
    themes,
    label: 'Dark',
    activeTheme: 'plum',
    onSelect: () => {},
    onPreview: () => {},
    onPreviewEnd: () => {},
  },
};
