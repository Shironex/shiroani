import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useScheduleStore } from '@/stores/useScheduleStore';
import ScheduleView from './ScheduleView';

const meta = {
  title: 'schedule/ScheduleView',
  component: ScheduleView,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof ScheduleView>;

export default meta;

type Story = StoryObj<typeof ScheduleView>;

/**
 * Empty daily view — a stable, non-loading, error-free state with no schedule
 * data, so the view renders its header, sub-header and the DailyView empty
 * state without a backend. Populated states are exercised in the per-component
 * stories and ScheduleView.test.tsx.
 */
export const Default: Story = {
  beforeEach: () => {
    useScheduleStore.setState({
      isLoading: false,
      error: null,
      schedule: {},
      viewMode: 'daily',
      selectedDay: '2024-01-15',
      onlyInLibrary: false,
      sort: 'time',
    });
  },
};
