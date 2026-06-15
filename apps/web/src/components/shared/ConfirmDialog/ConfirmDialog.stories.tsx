import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import ConfirmDialog from './ConfirmDialog';

/**
 * A confirmation dialog built on Radix `AlertDialog`. Renders a title,
 * description, a destructive (or default) confirm button and a cancel button.
 * Labels fall back to the localized `nav:dialog.*` strings when not supplied.
 * Content is portalled to `document.body`, so interaction tests query the body.
 */
const meta = {
  title: 'shared/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    // Portals to document.body — render its Docs preview in an iframe so the overlay + scroll-lock stay inside the preview block.
    docs: { story: { inline: false, iframeHeight: 440 } },
    a11y: { test: 'error' },
  },
  argTypes: {
    open: { description: 'Whether the dialog is visible.' },
    title: { description: 'Heading text shown at the top of the dialog.' },
    description: { description: 'Body copy explaining the consequence of confirming.' },
    confirmLabel: { description: 'Overrides the default localized confirm label.' },
    cancelLabel: { description: 'Overrides the default localized cancel label.' },
    variant: {
      control: 'inline-radio',
      options: ['destructive', 'default'],
      description: 'Visual style of the confirm button.',
    },
    onConfirm: { description: 'Fired when the confirm button is clicked.' },
    onOpenChange: { description: 'Fired with the next open state (e.g. false on cancel).' },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: 'Usunąć wpis?',
    description: 'Tej operacji nie można cofnąć.',
  },
};

export const DefaultVariant: Story = {
  args: {
    ...Default.args,
    variant: 'default',
    title: 'Zapisać zmiany?',
    description: 'Twoje zmiany zostaną zachowane.',
  },
};

export const ConfirmsOnClick: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: 'Usunąć wpis?',
    description: 'Tej operacji nie można cofnąć.',
  },
  play: async ({ canvasElement, args }) => {
    // AlertDialog content is portalled to document.body.
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(await canvas.findByRole('button', { name: /usuń|delete|potwierdź/i }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

export const CancelsOnClick: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: 'Usunąć wpis?',
    description: 'Tej operacji nie można cofnąć.',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(await canvas.findByRole('button', { name: /anuluj|cancel/i }));
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};
