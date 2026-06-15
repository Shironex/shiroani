import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import ChannelButton from './ChannelButton';

/**
 * A toggle pill for picking the update channel (Stable / Beta). Reflects its
 * selection through `aria-pressed`, fires `onClick` when chosen, and can be
 * disabled while an update is mid-flight.
 */
const meta = {
  title: 'settings/updates/ChannelButton',
  component: ChannelButton,
  argTypes: {
    active: { control: 'boolean', description: 'Whether this channel is selected.' },
    disabled: { control: 'boolean', description: 'Block selection while an update is locked.' },
    children: { control: 'text', description: 'The channel label.' },
  },
  parameters: {
    // A named button with a correct aria-pressed state passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof ChannelButton>;

export default meta;

type Story = StoryObj<typeof ChannelButton>;

/** Selected channel — `aria-pressed` is true. */
export const Active: Story = {
  args: { active: true, onClick: fn(), children: 'Stable' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Stable' });
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  },
};

/** Unselected channel — clicking it fires `onClick`. */
export const Inactive: Story = {
  args: { active: false, onClick: fn(), children: 'Beta' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Beta' });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

/** Disabled — locked while an update is downloading; clicking does nothing. */
export const Disabled: Story = {
  args: { active: false, disabled: true, onClick: fn(), children: 'Beta' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Beta' });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
