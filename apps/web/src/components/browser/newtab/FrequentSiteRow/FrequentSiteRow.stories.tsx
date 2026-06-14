import type { Meta, StoryObj } from '@storybook/react-vite';
import type { FrequentSite } from '@shiroani/shared';
import FrequentSiteRow from './FrequentSiteRow';

const site: FrequentSite = {
  url: 'https://shinden.pl',
  title: 'Shinden',
  visitCount: 12,
  lastVisited: 1_717_000_000_000,
};

const meta = {
  title: 'browser/newtab/FrequentSiteRow',
  component: FrequentSiteRow,
} satisfies Meta<typeof FrequentSiteRow>;

export default meta;

type Story = StoryObj<typeof FrequentSiteRow>;

export const Default: Story = {
  args: { site, onClick: () => {} },
};
