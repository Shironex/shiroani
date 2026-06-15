import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useDockStore } from '@/stores/useDockStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { withFullHeight } from '../../../../../.storybook/decorators';
import SummaryStep from './SummaryStep';

/**
 * Onboarding step 10 · Summary. A read-only confirmation screen reflecting every
 * store the wizard touched (language, theme, background, dock, Discord, AniList,
 * MyAnimeList, adblock). The "finish" CTA lives in the wizard chrome, not here.
 * Stories seed the contributing stores so the reflected rows are deterministic;
 * the account rows read "Not connected" in the web preview.
 */
const meta = {
  title: 'onboarding/steps/SummaryStep',
  component: SummaryStep,
  parameters: {
    layout: 'fullscreen',
    // The summary is a labelled heading + plain text rows with aria-hidden
    // icons — axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useSettingsStore.setState({ theme: 'plum' });
    useDockStore.setState({ edge: 'bottom', autoHide: false });
    useBrowserStore.setState({ adblockEnabled: true });
    useBackgroundStore.setState({ customBackground: null, backgroundBlur: 4 });
  },
} satisfies Meta<typeof SummaryStep>;

export default meta;

type Story = StoryObj<typeof SummaryStep>;

/** Reflected setup — adblock on, no background, accounts not connected. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'All ready!' })).toBeInTheDocument();
    await expect(canvas.getByText('Language')).toBeInTheDocument();
    await expect(canvas.getByText('Adblock')).toBeInTheDocument();
    await expect(canvas.getByText('Plum')).toBeInTheDocument();
  },
};
