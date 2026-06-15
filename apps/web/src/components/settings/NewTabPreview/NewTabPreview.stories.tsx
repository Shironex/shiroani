import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { useNewTabStore, type NewTabPanelId } from '@/stores/useNewTabStore';
import NewTabPreview from './NewTabPreview';

const DEFAULT_ORDER: NewTabPanelId[] = ['greeting', 'airing', 'quickAccess', 'recents', 'resume'];

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
 * Deterministic miniature of the browser New Tab page that reacts to the
 * `NewTabStore` in real time: panel visibility, drag order, watermark, greeting
 * name and airing-card count. Renders synthetic skeleton shapes — never live
 * data — and pairs Quick Access + Recents into one two-column row when both are
 * visible and adjacent, mirroring `NewTabPage`.
 */
const meta = {
  title: 'settings/NewTabPreview',
  component: NewTabPreview,
  parameters: {
    // Skeleton shapes are decorative and the stage is presentational, so axe
    // passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    label: { description: 'Optional uppercase caption rendered above the stage.' },
  },
  beforeEach: () => {
    seedStore();
  },
} satisfies Meta<typeof NewTabPreview>;

export default meta;

type Story = StoryObj<typeof NewTabPreview>;

export const Default: Story = {
  args: { label: 'Preview' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('newtab-preview')).toBeInTheDocument();
    // The decorative kanji watermark is shown by default.
    await expect(canvas.getByText('網')).toBeInTheDocument();
  },
};

/** Every panel hidden — the preview shows its all-hidden message. */
export const AllHidden: Story = {
  args: { label: 'Preview' },
  beforeEach: () => {
    seedStore({ hiddenPanels: DEFAULT_ORDER });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('All panels hidden.')).toBeInTheDocument();
  },
};

/** Watermark off and only the airing strip visible. */
export const AiringOnly: Story = {
  args: { label: 'Preview' },
  beforeEach: () => {
    seedStore({ order: ['airing'], showWatermark: false, airingCount: 16 });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('網')).not.toBeInTheDocument();
  },
};
