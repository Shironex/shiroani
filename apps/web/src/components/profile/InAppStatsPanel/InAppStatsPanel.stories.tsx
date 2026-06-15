import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useAppStatsStore } from '@/stores/useAppStatsStore';
import { mockAppStatsSnapshot } from '../profile-fixtures';
import InAppStatsPanel from './InAppStatsPanel';

const meta = {
  title: 'profile/InAppStatsPanel',
  component: InAppStatsPanel,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof InAppStatsPanel>;

export default meta;

type Story = StoryObj<typeof InAppStatsPanel>;

export const Default: Story = {
  beforeEach: () => {
    useAppStatsStore.setState({ snapshot: mockAppStatsSnapshot });
  },
};
