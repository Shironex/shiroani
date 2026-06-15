import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { DockEdge } from '@/stores/useDockStore';
import DockEdgePicker from './DockEdgePicker';

const LABELS: Record<DockEdge, string> = {
  bottom: 'Dół',
  top: 'Góra',
  left: 'Lewo',
  right: 'Prawo',
};

/**
 * A WAI-ARIA `radiogroup` for choosing which screen edge the dock sits on.
 * Shared by Settings · Dock and first-run onboarding so the two never drift.
 * Arrow keys move the checked radio (with wrap) and shift focus to it; clicking
 * or keying a radio fires `onSelect` with the edge. Comes in a compact `text`
 * variant and an `illustrated` variant with a mini edge-position glyph.
 */
const meta = {
  title: 'shared/DockEdgePicker',
  component: DockEdgePicker,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    value: {
      control: 'inline-radio',
      options: ['bottom', 'top', 'left', 'right'],
      description: 'The currently selected dock edge.',
    },
    onSelect: { description: 'Fired with the edge when a radio is clicked or keyed.' },
    getLabel: {
      description: 'Resolves the visible label for an edge (each surface owns its i18n).',
    },
    ariaLabel: { description: 'Accessible name for the radiogroup container.' },
    variant: {
      control: 'inline-radio',
      options: ['text', 'illustrated'],
      description:
        '`text` — compact text radios (Settings); `illustrated` — pills with a glyph (onboarding).',
    },
  },
} satisfies Meta<typeof DockEdgePicker>;

export default meta;

type Story = StoryObj<typeof DockEdgePicker>;

export const Text: Story = {
  args: { value: 'bottom', onSelect: fn(), getLabel: e => LABELS[e], ariaLabel: 'Dock edge' },
};

export const Illustrated: Story = {
  args: {
    value: 'left',
    onSelect: fn(),
    getLabel: e => LABELS[e],
    ariaLabel: 'Dock edge',
    variant: 'illustrated',
  },
};

export const SelectsOnClick: Story = {
  args: { value: 'bottom', onSelect: fn(), getLabel: e => LABELS[e], ariaLabel: 'Dock edge' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: 'Góra' }));
    await expect(args.onSelect).toHaveBeenCalledWith('top');
  },
};

export const ArrowKeyMovesSelection: Story = {
  args: { value: 'bottom', onSelect: fn(), getLabel: e => LABELS[e], ariaLabel: 'Dock edge' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const active = canvas.getByRole('radio', { name: 'Dół' });
    active.focus();
    // Edge order: bottom → top → left → right
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onSelect).toHaveBeenCalledWith('top');
  },
};
