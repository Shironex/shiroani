import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import TitleBar from './TitleBar';

/**
 * Custom title bar ("chrome") for the frameless Electron window. Renders a
 * 28px sidebar-toned strip with a centered uppercase wordmark and a draggable
 * region. On Windows/Linux it renders real minimize/maximize/close buttons
 * (each with a localized `aria-label`); on macOS the native traffic lights own
 * window controls, so only the wordmark + notification bell render. Storybook
 * runs on Chromium/macOS, so stories show the macOS branch — the window-control
 * button behavior is covered by the unit suite (which mocks the platform).
 */
const meta = {
  title: 'shared/TitleBar',
  component: TitleBar,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof TitleBar>;

export default meta;

type Story = StoryObj<typeof TitleBar>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The wordmark renders on every platform branch.
    await expect(canvas.getByText('SHIROANI')).toBeInTheDocument();
  },
};
