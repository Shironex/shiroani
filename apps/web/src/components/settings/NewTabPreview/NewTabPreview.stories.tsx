import type { Meta, StoryObj } from '@storybook/react-vite';
import NewTabPreview from './NewTabPreview';

const meta = {
  title: 'settings/NewTabPreview',
  component: NewTabPreview,
} satisfies Meta<typeof NewTabPreview>;

export default meta;

type Story = StoryObj<typeof NewTabPreview>;

export const Default: Story = { args: { label: 'Preview' } };
