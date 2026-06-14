import type { Meta, StoryObj } from '@storybook/react-vite';
import type { BrowserNode } from '@shiroani/shared';
import BrowserTabBar from './BrowserTabBar';

function leaf(id: string, title: string): BrowserNode {
  return {
    kind: 'leaf',
    id,
    url: `https://${id}.example`,
    title,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  };
}

const tabs: BrowserNode[] = [leaf('a', 'Shinden'), leaf('b', 'YouTube')];

const meta = {
  title: 'browser/BrowserTabBar',
  component: BrowserTabBar,
} satisfies Meta<typeof BrowserTabBar>;

export default meta;

type Story = StoryObj<typeof BrowserTabBar>;

export const Default: Story = {
  args: {
    tabs,
    activeTabId: 'a',
    onSelectTab: () => {},
    onCloseTab: () => {},
    onNewTab: () => {},
    onReorderTabs: () => {},
    onSplitTabs: () => {},
  },
};
