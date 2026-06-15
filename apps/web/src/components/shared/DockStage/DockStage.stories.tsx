import type { Meta, StoryObj } from '@storybook/react-vite';
import DockStage from './DockStage';

const meta = {
  title: 'shared/DockStage',
  component: DockStage,
} satisfies Meta<typeof DockStage>;

export default meta;

type Story = StoryObj<typeof DockStage>;

export const Bottom: Story = {
  args: { edge: 'bottom', label: 'PODGLĄD' },
};

export const Left: Story = {
  args: { edge: 'left' },
};
