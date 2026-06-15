import type { Meta, StoryObj } from '@storybook/react-vite';
import ProgressBar from './ProgressBar';

/**
 * A thin horizontal progress indicator used on anime cards, trending rows and the
 * diary streak. It exposes `progressbar` semantics with `aria-valuenow/min/max` and
 * an accessible name (caller-supplied `aria-label`, falling back to a localized
 * generic). It clamps `value` into 0–100, and supports tinted tones, an optional
 * accent glow, and an indeterminate sliding-gradient mode for unknown-duration loads.
 */
const meta = {
  title: 'shared/ProgressBar',
  component: ProgressBar,
  args: {
    'aria-label': 'Postęp',
  },
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100 },
      description: '0–100 fill percentage. Clamped; ignored when indeterminate.',
    },
    thickness: { control: 'number', description: 'Track height in px (default 3).' },
    glow: { control: 'boolean', description: 'Render a primary glow under the filled track.' },
    tone: {
      control: 'inline-radio',
      options: ['primary', 'muted', 'info'],
      description: 'Fill colour token.',
    },
    indeterminate: {
      control: 'boolean',
      description: 'Render a sliding gradient instead of a value-driven fill.',
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;

type Story = StoryObj<typeof ProgressBar>;

/** A typical mid-progress determinate bar with the accent glow. */
export const Determinate: Story = {
  args: { value: 64, thickness: 8, glow: true },
};

/** Empty (0%). */
export const Empty: Story = {
  args: { value: 0, thickness: 8 },
};

/** Half way. */
export const Half: Story = {
  args: { value: 50, thickness: 8 },
};

/** Complete (100%). */
export const Complete: Story = {
  args: { value: 100, thickness: 8 },
};

/** Over-100 input is clamped to a full bar. */
export const Overfilled: Story = {
  args: { value: 140, thickness: 8 },
};

/** The "info" tone variant. */
export const InfoTone: Story = {
  args: { value: 40, thickness: 8, tone: 'info' },
};

/** The "muted" tone variant. */
export const MutedTone: Story = {
  args: { value: 40, thickness: 8, tone: 'muted' },
};

/** Indeterminate sliding gradient for unknown-duration loads. */
export const Indeterminate: Story = {
  args: { indeterminate: true, thickness: 4 },
};
