import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import BrowserView from './BrowserView';

const meta = {
  title: 'browser/BrowserView',
  component: BrowserView,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof BrowserView>;

export default meta;

type Story = StoryObj<typeof BrowserView>;

/**
 * Default mount — restores persisted tabs (none in Storybook) and opens a
 * fresh new-tab page. Split/webview states are exercised in BrowserView.test.tsx,
 * where the webview registry and electron-store are mocked.
 */
export const Default: Story = {};
