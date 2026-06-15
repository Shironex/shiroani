import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import BrowserWebview from './BrowserWebview';

/**
 * Thin wrapper around the Electron `<webview>` tag for one browser pane. It
 * wires guest-page events (navigation, title/favicon, load state, fullscreen)
 * back into the browser store and toggles visibility via `isActive`.
 *
 * The `<webview>` tag is an Electron-only element — in the Storybook/Playwright
 * Chromium it renders as an inert unknown element with no guest WebContents, so
 * no page actually loads. These stories assert only that the element mounts
 * with the right `src`/`partition` attributes; guest-content behaviour is
 * exercised in the renderer, not here.
 */
const meta = {
  title: 'browser/BrowserWebview',
  component: BrowserWebview,
  parameters: {
    // The inert <webview> element carries no interactive content to flag, so
    // axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    paneId: { control: 'text', description: 'Pane id this webview is registered under.' },
    initialUrl: { control: 'text', description: 'Source URL passed to the guest webview.' },
    isActive: { control: 'boolean', description: 'When false the element is display:none.' },
  },
  args: { paneId: 'pane-1', initialUrl: 'https://example.com', isActive: true },
} satisfies Meta<typeof BrowserWebview>;

export default meta;

type Story = StoryObj<typeof BrowserWebview>;

/** Mounts the webview element with its src + persistent partition. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const webview = canvasElement.ownerDocument.querySelector('webview');
    await expect(webview).not.toBeNull();
    await expect(webview).toHaveAttribute('src', 'https://example.com');
    await expect(webview).toHaveAttribute('partition', 'persist:browser');
  },
};
