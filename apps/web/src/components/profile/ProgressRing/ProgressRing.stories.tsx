import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import ProgressRing from './ProgressRing';

/**
 * Circular SVG progress ring used on the Profile view to show library status
 * proportions (completed / watching / planning / paused / dropped). The arc is
 * decorative (`aria-hidden` SVG); the centred value label and the muted caption
 * underneath carry the readable text.
 */
const meta = {
  title: 'profile/ProgressRing',
  component: ProgressRing,
  parameters: {
    // Text-only label + decorative SVG arc — axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 }, description: 'Filled fraction, 0–100.' },
    size: { control: { type: 'number' }, description: 'Diameter in px (default 72).' },
    strokeWidth: {
      control: { type: 'number' },
      description: 'Arc stroke width in px (default 6).',
    },
    stroke: {
      control: 'text',
      description: 'Arc colour — any CSS colour or var (default --primary).',
    },
    label: { control: 'text', description: 'Muted caption rendered under the ring.' },
    valueLabel: {
      control: 'text',
      description: 'Centred value override (default "{value}%"); empty string hides it.',
    },
  },
} satisfies Meta<typeof ProgressRing>;

export default meta;

type Story = StoryObj<typeof ProgressRing>;

/** Default ring — the percentage is rounded and a muted caption sits beneath. */
export const Default: Story = {
  args: { value: 64, label: 'COMPLETED' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('64%')).toBeInTheDocument();
    await expect(canvas.getByText('COMPLETED')).toBeInTheDocument();
  },
};

/** Custom stroke colour — used per status to colour each library ring. */
export const CustomStroke: Story = {
  args: { value: 32, stroke: 'oklch(0.8 0.14 70)', label: 'PLANNING' },
};

/** Out-of-range values clamp to 0–100, so 150 reads as a full ring. */
export const ClampedFull: Story = {
  args: { value: 150, label: 'COMPLETED' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('100%')).toBeInTheDocument();
  },
};

/** A `valueLabel` override replaces the centred percentage with custom text. */
export const ValueLabelOverride: Story = {
  args: { value: 80, valueLabel: '4.2k', label: 'EPISODES' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('4.2k')).toBeInTheDocument();
  },
};
