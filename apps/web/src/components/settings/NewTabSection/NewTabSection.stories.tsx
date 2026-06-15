import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { useNewTabStore, type NewTabPanelId } from '@/stores/useNewTabStore';
import NewTabSection from './NewTabSection';

const DEFAULT_ORDER: NewTabPanelId[] = ['greeting', 'airing', 'quickAccess', 'recents', 'resume'];

/** Seed the new-tab store to a deterministic baseline before each story. */
function seedStore(overrides: Partial<ReturnType<typeof useNewTabStore.getState>> = {}) {
  useNewTabStore.setState({
    order: DEFAULT_ORDER,
    hiddenPanels: [],
    showWatermark: true,
    showGreetingName: true,
    airingCount: 12,
    ...overrides,
  });
}

/**
 * New-tab-page customisation card. Hosts a live `NewTabPreview`, a sortable list
 * of panel toggles, watermark + greeting-name switches, an airing-card-count
 * slider and a reset-to-defaults action. All state lives in the `NewTabStore`,
 * which each story seeds in `beforeEach`.
 */
const meta = {
  title: 'settings/NewTabSection',
  component: NewTabSection,
  parameters: {
    // The airing-count slider carries aria-label (forwarded to the slider
    // thumb), panel switches are labelled by their rows and the reset button is
    // named, so axe passes clean.
    a11y: { test: 'error' },
  },
  beforeEach: () => {
    seedStore();
  },
} satisfies Meta<typeof NewTabSection>;

export default meta;

type Story = StoryObj<typeof NewTabSection>;

/** Default mount — every panel visible, watermark + greeting name on. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('New tab page')).toBeInTheDocument();
    await expect(canvas.getByRole('switch', { name: 'Greeting' })).toBeChecked();
  },
};

/** Toggling a panel switch flips its visibility flag in the store. */
export const TogglePanel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('switch', { name: 'Quick access' }));
    await waitFor(() => expect(useNewTabStore.getState().hiddenPanels).toContain('quickAccess'));
  },
};

/** Nudging the airing-count slider writes the new value through the store. */
export const NudgeAiringCount: Story = {
  beforeEach: () => {
    const setAiringCount = fn();
    seedStore({ setAiringCount });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getByRole('slider', { name: 'Airing today card count' });
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(useNewTabStore.getState().setAiringCount).toHaveBeenCalledWith(13));
  },
};

/** All panels hidden — the preview collapses to its empty message. */
export const AllHidden: Story = {
  beforeEach: () => {
    seedStore({ hiddenPanels: DEFAULT_ORDER });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('All panels hidden.')).toBeInTheDocument();
  },
};

/** Reset restores the default order, visibility and counts in the store. */
export const Reset: Story = {
  beforeEach: () => {
    seedStore({ hiddenPanels: ['greeting', 'airing'], airingCount: 6 });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Reset to defaults' }));
    await waitFor(() => {
      const state = useNewTabStore.getState();
      expect(state.hiddenPanels).toEqual([]);
      expect(state.airingCount).toBe(12);
    });
  },
};
