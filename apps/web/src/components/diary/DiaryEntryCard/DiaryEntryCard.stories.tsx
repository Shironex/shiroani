import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryEntryCard from './DiaryEntryCard';

const entry: DiaryEntry = {
  id: 1,
  title: 'Pierwszy wpis',
  contentJson: JSON.stringify({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Notatka z dzisiejszego odcinka.' }] },
    ],
  }),
  createdAt: '2025-06-15',
  updatedAt: '2025-06-15',
  isPinned: false,
  coverGradient: 'sakura',
  mood: 'great',
  tags: ['anime', 'recenzja'],
  animeTitle: 'Frieren',
};

const meta = {
  title: 'diary/DiaryEntryCard',
  component: DiaryEntryCard,
} satisfies Meta<typeof DiaryEntryCard>;

export default meta;

type Story = StoryObj<typeof DiaryEntryCard>;

export const Default: Story = {
  args: {
    entry,
    onSelect: () => {},
    onRemove: () => {},
    onTogglePin: () => {},
  },
};
