import type { Meta, StoryObj } from '@storybook/react-vite';
import GeneralSection from './GeneralSection';

const meta = {
  title: 'settings/GeneralSection',
  component: GeneralSection,
} satisfies Meta<typeof GeneralSection>;

export default meta;

type Story = StoryObj<typeof GeneralSection>;

export const Default: Story = {};
