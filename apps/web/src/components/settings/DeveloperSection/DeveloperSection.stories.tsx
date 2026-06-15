import type { Meta, StoryObj } from '@storybook/react-vite';
import DeveloperSection from './DeveloperSection';

const meta = {
  title: 'settings/DeveloperSection',
  component: DeveloperSection,
} satisfies Meta<typeof DeveloperSection>;

export default meta;

type Story = StoryObj<typeof DeveloperSection>;

export const Default: Story = {};
