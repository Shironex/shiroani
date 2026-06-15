import type { Meta, StoryObj } from '@storybook/react-vite';
import PreviewStage from './PreviewStage';

const meta = {
  title: 'shared/PreviewStage',
  component: PreviewStage,
} satisfies Meta<typeof PreviewStage>;

export default meta;

type Story = StoryObj<typeof PreviewStage>;

export const Default: Story = {
  args: {
    label: 'PODGLĄD',
    children: <div className="absolute inset-0 grid place-items-center text-white/70">Preview</div>,
  },
};
