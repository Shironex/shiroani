import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, fn } from 'storybook/test';
import ImageDropDialog from './ImageDropDialog';

/** A real 1x1 PNG so the preview thumbnail decodes. */
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function droppedPng(name = 'wallpaper.png'): File {
  const bytes = Uint8Array.from(atob(TINY_PNG_BASE64), c => c.charCodeAt(0));
  return new File([bytes], name, { type: 'image/png' });
}

/**
 * Shown after an image is dropped onto the window. Nothing is stored until a
 * choice is clicked; "Set as mascot sprite" appears only where the mascot
 * exists (Windows). Radix `Dialog`, portalled to `document.body`.
 */
const meta = {
  title: 'shared/ImageDropDialog',
  component: ImageDropDialog,
  parameters: {
    docs: { story: { inline: false, iframeHeight: 520 } },
    a11y: { test: 'error' },
  },
  argTypes: {
    file: { description: 'The dropped image; the dialog is open while this is set.' },
    onClose: { description: 'Called on cancel, or after the image was applied.' },
    showMascotOption: { description: 'Offer the mascot sprite choice (Windows only in the app).' },
  },
} satisfies Meta<typeof ImageDropDialog>;

export default meta;

type Story = StoryObj<typeof ImageDropDialog>;

/** Windows: both choices. */
export const WithMascotOption: Story = {
  args: { file: droppedPng(), onClose: fn(), showMascotOption: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await expect(await canvas.findByText('What should this image be?')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Set as background' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Set as mascot sprite' })).toBeInTheDocument();
  },
};

/** macOS and Linux: no mascot, so only the background choice. */
export const BackgroundOnly: Story = {
  args: { file: droppedPng('photo.png'), onClose: fn(), showMascotOption: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await expect(await canvas.findByText('photo.png')).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Set as mascot sprite' })
    ).not.toBeInTheDocument();
  },
};

/** No file: nothing is rendered. */
export const Closed: Story = {
  args: { file: null, onClose: fn(), showMascotOption: true },
};
