import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bookmark } from 'lucide-react';
import PanelHeader from './PanelHeader';

const meta = {
  title: 'browser/newtab/PanelHeader',
  component: PanelHeader,
} satisfies Meta<typeof PanelHeader>;

export default meta;

type Story = StoryObj<typeof PanelHeader>;

export const Default: Story = {
  args: {
    id: 'panel-header-demo',
    icon: Bookmark,
    title: 'Quick access',
    meta: '4 tabs',
  },
};
