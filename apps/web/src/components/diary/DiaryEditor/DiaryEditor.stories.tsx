import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryEditor from './DiaryEditor';

const entry: DiaryEntry = {
  id: 1,
  title: 'Refleksja po odcinku',
  contentJson: JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pierwsze wrażenia.' }] }],
  }),
  createdAt: '2025-06-15',
  updatedAt: '2025-06-15',
  isPinned: false,
  coverGradient: 'sakura',
  mood: 'great',
  tags: ['anime'],
};

const meta = {
  title: 'diary/DiaryEditor',
  component: DiaryEditor,
} satisfies Meta<typeof DiaryEditor>;

export default meta;

type Story = StoryObj<typeof DiaryEditor>;

export const New: Story = {
  args: {
    entry: null,
    onClose: () => {},
    onCreate: async () => true,
    onUpdate: async () => true,
  },
};

export const Editing: Story = {
  args: {
    entry,
    onClose: () => {},
    onCreate: async () => true,
    onUpdate: async () => true,
  },
};
