import type { Meta, StoryObj } from '@storybook/react-vite';
import StatCell from './StatCell';

const meta = {
  title: 'shared/StatCell',
  component: StatCell,
} satisfies Meta<typeof StatCell>;

export default meta;

type Story = StoryObj<typeof StatCell>;

export const Default: Story = {
  args: { label: 'Watched', value: 184, sub: 'of 220' },
};

export const Serif: Story = {
  args: { label: 'Mean score', value: '8.4', serif: true },
};
