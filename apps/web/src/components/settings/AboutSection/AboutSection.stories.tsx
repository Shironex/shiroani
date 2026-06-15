import type { Meta, StoryObj } from '@storybook/react-vite';
import AboutSection from './AboutSection';

const meta = {
  title: 'settings/AboutSection',
  component: AboutSection,
} satisfies Meta<typeof AboutSection>;

export default meta;

type Story = StoryObj<typeof AboutSection>;

export const Default: Story = {};
