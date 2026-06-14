import type { Meta, StoryObj } from '@storybook/react-vite';
import DiarySkeleton from './DiarySkeleton';

const meta = {
  title: 'diary/DiarySkeleton',
  component: DiarySkeleton,
} satisfies Meta<typeof DiarySkeleton>;

export default meta;

type Story = StoryObj<typeof DiarySkeleton>;

export const Default: Story = {};
