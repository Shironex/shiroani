import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import SelectableChipButton from './SelectableChipButton';

/**
 * The shared selectable-chip pill used across settings (channel picker,
 * font-scale buttons, language picker). Reflects selection through
 * `aria-pressed`, fires `onClick` when chosen, and takes its per-caller
 * padding / text size (and any layout extras) through `className`.
 */
const meta = {
  title: 'settings/SelectableChipButton',
  component: SelectableChipButton,
  argTypes: {
    active: { control: 'boolean', description: 'Whether this chip is selected.' },
    disabled: { control: 'boolean', description: 'Block selection.' },
    className: { control: 'text', description: 'Per-caller padding / text size / layout.' },
    children: { control: 'text', description: 'The chip label.' },
  },
  parameters: {
    // A named button with a correct aria-pressed state passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof SelectableChipButton>;

export default meta;

type Story = StoryObj<typeof SelectableChipButton>;

/** Selected chip — `aria-pressed` is true. */
export const Active: Story = {
  args: { active: true, onClick: fn(), className: 'py-[6px] text-[12px]', children: '100%' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: '100%' });
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  },
};

/** Unselected chip — clicking it fires `onClick`. */
export const Inactive: Story = {
  args: { active: false, onClick: fn(), className: 'py-[6px] text-[12px]', children: '110%' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: '110%' });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

/** Disabled — clicking does nothing. */
export const Disabled: Story = {
  args: {
    active: false,
    disabled: true,
    onClick: fn(),
    className: 'py-[6px] text-[12px] disabled:opacity-60 disabled:cursor-not-allowed',
    children: 'Beta',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Beta' });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
