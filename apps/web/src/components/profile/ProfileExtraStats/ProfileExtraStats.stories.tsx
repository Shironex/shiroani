import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockExtraStats } from '../profile-fixtures';
import ProfileExtraStats from './ProfileExtraStats';

const renderHead = (label: string) => (
  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
    {label}
  </h3>
);

const meta = {
  title: 'profile/ProfileExtraStats',
  component: ProfileExtraStats,
  args: { renderHead },
} satisfies Meta<typeof ProfileExtraStats>;

export default meta;

type Story = StoryObj<typeof ProfileExtraStats>;

export const Default: Story = {
  args: { stats: mockExtraStats },
};
