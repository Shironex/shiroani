import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import DropOverlay from './DropOverlay';

interface DragPayload {
  files?: File[];
  strings?: Record<string, string>;
}

/** Dispatch a real DragEvent on window, as an OS drag entering the app would. */
function dispatchDrag(type: 'dragenter' | 'drop', { files = [], strings = {} }: DragPayload) {
  const dataTransfer = new DataTransfer();
  for (const file of files) dataTransfer.items.add(file);
  for (const [format, value] of Object.entries(strings)) dataTransfer.setData(format, value);
  window.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
}

/**
 * Window-level drop target, mounted once at the app root. Invisible until an
 * external drag enters the window, then a full-window card says what the drop
 * will do: open a link in a browser tab, import a ShiroAni export, or use an
 * image as background or mascot. The overlay hides itself about a second after
 * the drag stops, so the drag stories assert right after dispatching.
 */
const meta = {
  title: 'shared/DropOverlay',
  component: DropOverlay,
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false, iframeHeight: 420 } },
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DropOverlay>;

export default meta;

type Story = StoryObj<typeof DropOverlay>;

/** Idle: nothing is dragged, nothing is shown. */
export const Idle: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('status')).not.toBeInTheDocument();
  },
};

/** A web link dragged in from a browser. */
export const DraggingLink: Story = {
  play: async ({ canvasElement }) => {
    dispatchDrag('dragenter', { strings: { 'text/uri-list': 'https://anilist.co/anime/1' } });
    const status = await within(canvasElement).findByRole('status');
    await expect(status).toHaveTextContent('Drop to open the link');
  },
};

/** A ShiroAni export dragged in from the file manager. */
export const DraggingExport: Story = {
  play: async ({ canvasElement }) => {
    dispatchDrag('dragenter', {
      files: [new File(['{}'], 'shiroani-export.json', { type: 'application/json' })],
    });
    const status = await within(canvasElement).findByRole('status');
    await expect(status).toHaveTextContent('Drop to import');
  },
};

/** An image dragged in from the file manager. */
export const DraggingImage: Story = {
  play: async ({ canvasElement }) => {
    dispatchDrag('dragenter', {
      files: [new File(['x'], 'wallpaper.png', { type: 'image/png' })],
    });
    const status = await within(canvasElement).findByRole('status');
    await expect(status).toHaveTextContent('Drop the image');
  },
};

/** Several files at once are not supported. */
export const DraggingUnsupported: Story = {
  play: async ({ canvasElement }) => {
    dispatchDrag('dragenter', {
      files: [
        new File(['x'], 'a.png', { type: 'image/png' }),
        new File(['y'], 'b.png', { type: 'image/png' }),
      ],
    });
    const status = await within(canvasElement).findByRole('status');
    await expect(status).toHaveTextContent("This can't be dropped here");
  },
};

/** Dropping an image opens the choice dialog; nothing changes until a click. */
export const DroppedImage: Story = {
  play: async ({ canvasElement }) => {
    dispatchDrag('drop', { files: [new File(['x'], 'wallpaper.png', { type: 'image/png' })] });
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText('What should this image be?')).toBeInTheDocument();
  },
};
