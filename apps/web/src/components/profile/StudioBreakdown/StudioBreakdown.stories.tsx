import type { Meta, StoryObj } from '@storybook/react-vite';
import type { UserProfile } from '@shiroani/shared';
import StudioBreakdown from './StudioBreakdown';

type Studios = UserProfile['statistics']['studios'];

const studios = [
  { name: 'MAPPA', count: 32 },
  { name: 'Wit Studio', count: 18 },
  { name: 'Bones', count: 12 },
  { name: 'Ufotable', count: 9 },
] as unknown as Studios;

const meta = {
  title: 'profile/StudioBreakdown',
  component: StudioBreakdown,
} satisfies Meta<typeof StudioBreakdown>;

export default meta;

type Story = StoryObj<typeof StudioBreakdown>;

export const Default: Story = {
  args: { studios },
};

export const Empty: Story = {
  args: { studios: [] },
};
