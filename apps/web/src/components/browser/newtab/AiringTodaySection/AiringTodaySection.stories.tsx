import type { Meta, StoryObj } from '@storybook/react-vite';
import AiringTodaySection from './AiringTodaySection';

const meta = {
  title: 'browser/newtab/AiringTodaySection',
  component: AiringTodaySection,
} satisfies Meta<typeof AiringTodaySection>;

export default meta;

type Story = StoryObj<typeof AiringTodaySection>;

export const Default: Story = {
  args: { maxCards: 8 },
};
