import type { Meta, StoryObj } from '@storybook/react-vite';
import ViewsSection from './ViewsSection';

const meta = {
  title: 'settings/ViewsSection',
  component: ViewsSection,
} satisfies Meta<typeof ViewsSection>;

export default meta;

type Story = StoryObj<typeof ViewsSection>;

export const Default: Story = {};
