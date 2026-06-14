import type { Meta, StoryObj } from '@storybook/react-vite';
import type { QuickAccessSite } from '@shiroani/shared';
import QuickAccessPanel from './QuickAccessPanel';

const sites: QuickAccessSite[] = [
  { id: 'yt', name: 'YouTube', url: 'https://youtube.com', isPredefined: true },
  { id: 'sh', name: 'Shinden', url: 'https://shinden.pl' },
];

const meta = {
  title: 'browser/newtab/QuickAccessPanel',
  component: QuickAccessPanel,
} satisfies Meta<typeof QuickAccessPanel>;

export default meta;

type Story = StoryObj<typeof QuickAccessPanel>;

export const Default: Story = {
  args: {
    sites,
    hiddenPredefined: [],
    onNavigate: () => {},
    onRemove: () => {},
    onAdd: () => {},
    onShowPredefined: () => {},
  },
};
