import type { Meta, StoryObj } from '@storybook/react-vite';
import MascotPreview from './MascotPreview';

const meta = {
  title: 'settings/MascotPreview',
  component: MascotPreview,
} satisfies Meta<typeof MascotPreview>;

export default meta;

type Story = StoryObj<typeof MascotPreview>;

export const Default: Story = {
  args: { current: 128, min: 48, max: 256, label: 'Preview' },
};
