import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { toLocalDate } from '@shiroani/shared';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useScheduleStore } from '@/stores/useScheduleStore';
import BrowserView from './BrowserView';

/**
 * Top-level embedded browser: the tab strip, the navigation toolbar, an
 * optional in-page find bar, and the stacked webview layer (each tab kept
 * mounted to preserve guest state). On mount it restores persisted tabs (none
 * in Storybook) and opens a fresh new-tab page, which renders NewTabPage with
 * its quick-access / airing / resume panels.
 *
 * NewTabPage's airing panel calls `fetchDaily` for today when the schedule slot
 * is empty, and that emit would open the socket and reconnect forever against
 * the dead test backend — pegging the headless Chromium page. Seeding a
 * non-empty schedule slot for today short-circuits that effect, so no socket is
 * attempted. The `<webview>` tags are inert Electron-only elements here; the
 * stories assert the surrounding chrome (tabs + toolbar) only.
 */
const meta = {
  title: 'browser/BrowserView',
  component: BrowserView,
  parameters: {
    layout: 'fullscreen',
    // TODO(a11y): the default mount embeds NewTabPage, whose GreetingBanner uses
    // a nested <header> (banner landmark) — axe flags landmark-banner-is-top-level.
    // That banner belongs to the browser/newtab sub-feature (its own stories),
    // not the browser chrome under test here, so it's fixed in NewTabPage's a11y
    // pass. The chrome itself (tabs, toolbar) is exercised by the play test below.
    a11y: { test: 'todo' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    // Non-empty schedule slot for today → AiringTodaySection's effect
    // short-circuits → no socket.
    useScheduleStore.setState({ schedule: { [toLocalDate(new Date())]: [] }, isLoading: false });
  },
} satisfies Meta<typeof BrowserView>;

export default meta;

type Story = StoryObj<typeof BrowserView>;

/**
 * Default mount — a single fresh new-tab page with the full browser chrome.
 * Split/webview-stability states are exercised in BrowserView.test.tsx, where
 * the webview registry and electron-store are mocked.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The tab strip and the labelled address bar both render.
    await expect(await canvas.findByRole('tablist')).toBeInTheDocument();
    await expect(canvas.getByRole('combobox', { name: 'Address bar' })).toBeInTheDocument();
  },
};
