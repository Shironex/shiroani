import type { Meta, StoryObj } from '@storybook/react-vite';
import ThemesSection from './ThemesSection';

const meta = {
  title: 'settings/ThemesSection',
  component: ThemesSection,
} satisfies Meta<typeof ThemesSection>;

export default meta;

type Story = StoryObj<typeof ThemesSection>;

export const Default: Story = {};
