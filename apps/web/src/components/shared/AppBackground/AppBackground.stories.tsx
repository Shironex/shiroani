import type { Meta, StoryObj } from '@storybook/react-vite';
import AppBackground from './AppBackground';

/**
 * The decorative shell backdrop behind every view: two theme-token radial glows
 * (`--glow-1` / `--glow-2`) plus a subtle SVG fractal-noise overlay. It is purely
 * presentational — `pointer-events: none` and `aria-hidden` — and sits at z-index 0
 * beneath app content. It takes no props; appearance is driven entirely by the
 * active theme tokens, so switching the Storybook theme toolbar restyles it.
 */
const meta = {
  title: 'shared/AppBackground',
  component: AppBackground,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof AppBackground>;

export default meta;

type Story = StoryObj<typeof AppBackground>;

export const Default: Story = {};
