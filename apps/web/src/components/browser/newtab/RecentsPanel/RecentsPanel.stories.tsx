import type { Meta, StoryObj } from '@storybook/react-vite';
import type { FrequentSite } from '@shiroani/shared';
import RecentsPanel from './RecentsPanel';

const frequentSites: FrequentSite[] = [
  {
    url: 'https://shinden.pl',
    title: 'Shinden',
    visitCount: 12,
    lastVisited: 1_717_000_000_000,
  },
];

const meta = {
  title: 'browser/newtab/RecentsPanel',
  component: RecentsPanel,
} satisfies Meta<typeof RecentsPanel>;

export default meta;

type Story = StoryObj<typeof RecentsPanel>;

export const Default: Story = {
  args: { frequentSites, onNavigate: () => {} },
};

export const Empty: Story = {
  args: { frequentSites: [], onNavigate: () => {} },
};
