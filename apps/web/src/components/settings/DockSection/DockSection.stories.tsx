import type { Meta, StoryObj } from '@storybook/react-vite';
import DockSection from './DockSection';

const meta = {
  title: 'settings/DockSection',
  component: DockSection,
} satisfies Meta<typeof DockSection>;

export default meta;

type Story = StoryObj<typeof DockSection>;

export const Default: Story = {};
