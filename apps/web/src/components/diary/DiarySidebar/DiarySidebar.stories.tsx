import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DiaryEntry } from '@shiroani/shared';
import DiarySidebar from './DiarySidebar';

const today = new Date().toISOString();

const entries: DiaryEntry[] = [
  {
    id: 1,
    title: 'Wpis',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: today,
    updatedAt: today,
    isPinned: false,
    tags: ['anime', 'recenzja'],
  },
];

const meta = {
  title: 'diary/DiarySidebar',
  component: DiarySidebar,
} satisfies Meta<typeof DiarySidebar>;

export default meta;

type Story = StoryObj<typeof DiarySidebar>;

export const Default: Story = {
  args: {
    entries,
  },
};

export const Empty: Story = {
  args: {
    entries: [],
  },
};
