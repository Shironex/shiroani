import type { Meta, StoryObj } from '@storybook/react-vite';
import SupportSection from './SupportSection';

const meta = {
  title: 'settings/SupportSection',
  component: SupportSection,
} satisfies Meta<typeof SupportSection>;

export default meta;

type Story = StoryObj<typeof SupportSection>;

export const Default: Story = {};
