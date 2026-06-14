import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryEntryGrid from './DiaryEntryGrid';

const entries: DiaryEntry[] = [
  {
    id: 1,
    title: 'Pierwszy wpis',
    contentJson: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Notatka.' }] }],
    }),
    createdAt: '2025-06-15',
    updatedAt: '2025-06-15',
    isPinned: true,
    coverGradient: 'sakura',
    mood: 'great',
    tags: ['anime'],
  },
  {
    id: 2,
    title: 'Drugi wpis',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: '2025-06-14',
    updatedAt: '2025-06-14',
    isPinned: false,
    coverGradient: 'ocean',
  },
];

const meta = {
  title: 'diary/DiaryEntryGrid',
  component: DiaryEntryGrid,
} satisfies Meta<typeof DiaryEntryGrid>;

export default meta;

type Story = StoryObj<typeof DiaryEntryGrid>;

export const Grid: Story = {
  args: {
    entries,
    viewMode: 'grid',
    onSelect: () => {},
    onRemove: () => {},
    onTogglePin: () => {},
  },
};

export const List: Story = {
  args: {
    entries,
    viewMode: 'list',
    onSelect: () => {},
    onRemove: () => {},
    onTogglePin: () => {},
  },
};
