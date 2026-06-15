import type { Meta, StoryObj } from '@storybook/react-vite';
import MascotSection from './MascotSection';

const meta = {
  title: 'settings/MascotSection',
  component: MascotSection,
} satisfies Meta<typeof MascotSection>;

export default meta;

type Story = StoryObj<typeof MascotSection>;

export const Default: Story = {};
