import type { Meta, StoryObj } from '@storybook/react-vite';
import ResumeWatchingSection from './ResumeSection';

const meta = {
  title: 'browser/newtab/ResumeSection',
  component: ResumeWatchingSection,
} satisfies Meta<typeof ResumeWatchingSection>;

export default meta;

type Story = StoryObj<typeof ResumeWatchingSection>;

export const Default: Story = {
  args: { onNavigate: () => {} },
};
