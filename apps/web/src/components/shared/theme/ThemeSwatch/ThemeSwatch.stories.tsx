import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ThemeOption } from '@/lib/theme';
import ThemeSwatch from './ThemeSwatch';

const option: ThemeOption = {
  value: 'sakura' as ThemeOption['value'],
  label: 'Sakura',
  color: 'oklch(0.72 0.15 355)',
  isDark: true,
  testId: 'theme-sakura',
};

const meta = {
  title: 'shared/theme/ThemeSwatch',
  component: ThemeSwatch,
} satisfies Meta<typeof ThemeSwatch>;

export default meta;

type Story = StoryObj<typeof ThemeSwatch>;

export const Default: Story = {
  args: {
    option,
    isActive: true,
    onSelect: () => {},
    onPreview: () => {},
    onPreviewEnd: () => {},
  },
};
