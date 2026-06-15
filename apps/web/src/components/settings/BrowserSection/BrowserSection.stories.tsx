import type { Meta, StoryObj } from '@storybook/react-vite';
import BrowserSection from './BrowserSection';

const meta = {
  title: 'settings/BrowserSection',
  component: BrowserSection,
} satisfies Meta<typeof BrowserSection>;

export default meta;

type Story = StoryObj<typeof BrowserSection>;

export const Default: Story = {};
