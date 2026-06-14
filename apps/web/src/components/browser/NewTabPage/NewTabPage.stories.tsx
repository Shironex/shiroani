import type { Meta, StoryObj } from '@storybook/react-vite';
import NewTabPage from './NewTabPage';

const meta = {
  title: 'browser/NewTabPage',
  component: NewTabPage,
} satisfies Meta<typeof NewTabPage>;

export default meta;

type Story = StoryObj<typeof NewTabPage>;

export const Default: Story = {
  args: { onNavigate: () => {} },
};
