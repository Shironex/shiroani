import type { Meta, StoryObj } from '@storybook/react-vite';
import SuiteSection from './SuiteSection';

const meta = {
  title: 'settings/SuiteSection',
  component: SuiteSection,
} satisfies Meta<typeof SuiteSection>;

export default meta;

type Story = StoryObj<typeof SuiteSection>;

export const Default: Story = {};
