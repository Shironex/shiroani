import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useMalProfileStore } from '@/stores/useMalProfileStore';
import { mockMalStats } from '../profile-fixtures';
import MalStatsPanel from './MalStatsPanel';

const meta = {
  title: 'profile/MalStatsPanel',
  component: MalStatsPanel,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof MalStatsPanel>;

export default meta;

type Story = StoryObj<typeof MalStatsPanel>;

export const Connected: Story = {
  beforeEach: () => {
    // Seed a connected profile and no-op the fetch so the panel renders without
    // a socket round-trip.
    useMalProfileStore.setState({
      profile: mockMalStats,
      isLoading: false,
      error: null,
      notConnected: false,
      fetchProfile: () => {},
    });
  },
};
