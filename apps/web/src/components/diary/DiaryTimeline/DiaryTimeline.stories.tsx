import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryTimeline from './DiaryTimeline';

const today = new Date().toISOString();

const entries: DiaryEntry[] = [
  {
    id: 1,
    title: 'Dzisiejszy odcinek',
    contentJson: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Świetny finał sezonu.' }] }],
    }),
    createdAt: today,
    updatedAt: today,
    isPinned: true,
    mood: 'great',
    tags: ['finał', 'anime'],
    animeTitle: 'Frieren',
  },
  {
    id: 2,
    title: 'Notatka',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: today,
    updatedAt: today,
    isPinned: false,
  },
];

const meta = {
  title: 'diary/DiaryTimeline',
  component: DiaryTimeline,
} satisfies Meta<typeof DiaryTimeline>;

export default meta;

type Story = StoryObj<typeof DiaryTimeline>;

export const Default: Story = {
  args: {
    entries,
    onSelect: () => {},
    onRemove: () => {},
    onTogglePin: () => {},
  },
};
