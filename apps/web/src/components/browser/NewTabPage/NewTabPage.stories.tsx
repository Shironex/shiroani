import type { Meta, StoryObj } from '@storybook/react-vite';
import { toLocalDate } from '@shiroani/shared';
import { useScheduleStore } from '@/stores/useScheduleStore';
import NewTabPage from './NewTabPage';

const meta = {
  title: 'browser/NewTabPage',
  component: NewTabPage,
  parameters: {
    // GreetingBanner is a plain block (not a <header>), so the page carries no
    // stray banner landmark — the full new-tab surface passes the axe scan.
    a11y: { test: 'error' },
  },
  beforeEach: () => {
    // Non-empty schedule slot for today → AiringTodaySection's fetch effect
    // short-circuits → no socket opened against the dead test backend.
    useScheduleStore.setState({ schedule: { [toLocalDate(new Date())]: [] }, isLoading: false });
  },
} satisfies Meta<typeof NewTabPage>;

export default meta;

type Story = StoryObj<typeof NewTabPage>;

export const Default: Story = {
  args: { onNavigate: () => {} },
};
