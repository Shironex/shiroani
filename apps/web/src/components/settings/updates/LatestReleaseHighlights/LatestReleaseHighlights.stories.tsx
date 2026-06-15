import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import LatestReleaseHighlights from './LatestReleaseHighlights';

/**
 * A compact "what's new" card: pill-tagged highlights from the latest changelog
 * release (capped at 4 lines). Reads the static changelog data through its hook,
 * so no props are needed; renders nothing when there is no release.
 */
const meta = {
  title: 'settings/updates/LatestReleaseHighlights',
  component: LatestReleaseHighlights,
  parameters: {
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof LatestReleaseHighlights>;

export default meta;

type Story = StoryObj<typeof LatestReleaseHighlights>;

/** The latest release's highlights. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("What's new in this version.")).toBeInTheDocument();
  },
};
