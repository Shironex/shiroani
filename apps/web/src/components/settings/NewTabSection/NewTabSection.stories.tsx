import type { Meta, StoryObj } from '@storybook/react-vite';
import NewTabSection from './NewTabSection';

const meta = {
  title: 'settings/NewTabSection',
  component: NewTabSection,
} satisfies Meta<typeof NewTabSection>;

export default meta;

type Story = StoryObj<typeof NewTabSection>;

export const Default: Story = {};
