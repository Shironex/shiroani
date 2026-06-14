import type { Meta, StoryObj } from '@storybook/react-vite';
import type { QuickAccessSite } from '@shiroani/shared';
import SiteCard from './SiteCard';

const site: QuickAccessSite = {
  id: 'yt',
  name: 'YouTube',
  url: 'https://youtube.com',
  isPredefined: true,
};

const meta = {
  title: 'browser/newtab/SiteCard',
  component: SiteCard,
} satisfies Meta<typeof SiteCard>;

export default meta;

type Story = StoryObj<typeof SiteCard>;

export const Default: Story = {
  args: { site, onClick: () => {}, onRemove: () => {} },
};
