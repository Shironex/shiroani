import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useUpdateStore } from '@/stores/useUpdateStore';
import SplashScreen from './SplashScreen';

/**
 * Full-screen boot overlay that composes the ambient glow, kanji watermark,
 * `SplashHero`, and `SplashFooter`. It resolves a variant (error > updating >
 * loading) from the `error`/`ready` props plus `useUpdateStore`'s install flag,
 * rotates loading prose, and — once `ready` and the minimum display window have
 * elapsed — plays a fade-out and calls `onDismissed`.
 *
 * Every story uses `ready: false` so the overlay stays mounted for the render +
 * a11y pass (a ready splash would dismiss itself after the min-display timer).
 * The `beforeEach` seeds `useUpdateStore` to a deterministic, non-installing
 * baseline so the variant is driven purely by the story's props; no backend or
 * socket is touched.
 */
const meta = {
  title: 'splash/SplashScreen',
  component: SplashScreen,
  parameters: {
    layout: 'fullscreen',
    // Hero mascot + footer controls are labelled; glow, ring, watermark, and
    // tone dot are aria-hidden decoration, so axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useUpdateStore.setState({ isInstalling: false, updateInfo: null });
  },
  argTypes: {
    ready: {
      control: 'boolean',
      description: 'True once boot finishes; triggers dismissal after the min-display window.',
    },
    error: {
      control: 'text',
      description: 'Fatal boot error message; flips the overlay to the error variant.',
    },
    onDismissed: { description: 'Fired after the fade-out completes once the splash dismisses.' },
  },
  args: {
    ready: false,
    error: null,
  },
} satisfies Meta<typeof SplashScreen>;

export default meta;

type Story = StoryObj<typeof SplashScreen>;

/** Default boot — loading hero, rotating prose, spinner ring. */
export const Loading: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByAltText('ShiroAni mascot')).toBeInTheDocument();
    await expect(canvas.getByText('白アニ · your anime')).toBeInTheDocument();
  },
};

/** Mid-update — install flag set, info-toned hero + footer. */
export const Updating: Story = {
  beforeEach: () => {
    useUpdateStore.setState({ isInstalling: true, updateInfo: { version: '0.6.0' } as never });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('updating · v0.6.0')).toBeInTheDocument();
  },
};

/** Fatal boot error — destructive hero copy + Close/Retry footer actions. */
export const Error: Story = {
  args: { error: 'network unreachable' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  },
};
