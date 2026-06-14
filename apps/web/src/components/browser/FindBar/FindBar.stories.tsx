import type { Meta, StoryObj } from '@storybook/react-vite';
import FindBar from './FindBar';

const meta = {
  title: 'browser/FindBar',
  component: FindBar,
} satisfies Meta<typeof FindBar>;

export default meta;

type Story = StoryObj<typeof FindBar>;

export const Default: Story = {
  args: { activePaneId: null, onClose: () => {} },
};
