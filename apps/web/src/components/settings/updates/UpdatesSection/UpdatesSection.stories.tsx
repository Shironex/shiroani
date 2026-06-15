import type { Meta, StoryObj } from '@storybook/react-vite';
import UpdatesSection from './UpdatesSection';

const meta = {
  title: 'settings/updates/UpdatesSection',
  component: UpdatesSection,
} satisfies Meta<typeof UpdatesSection>;

export default meta;

type Story = StoryObj<typeof UpdatesSection>;

export const Default: Story = {};
