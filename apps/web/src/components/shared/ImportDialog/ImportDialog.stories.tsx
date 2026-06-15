import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import ImportDialog from './ImportDialog';

/**
 * Import dialog (Radix `Dialog`, portalled to `document.body`). On open it
 * auto-opens the native file picker, then walks a state machine — loading-file
 * → preview (pick a duplicate strategy, then Import) → importing (live progress)
 * → done, or file-error. Outside Electron there is no file bridge, so the
 * default story parks on its empty idle state; the preview stories stub a
 * `window.electronAPI` bridge so the configurable preview step is shown.
 */
const VALID_EXPORT = {
  version: 1,
  exportedAt: '2026-06-15T00:00:00.000Z',
  source: 'shiroani',
  data: {
    library: [{ title: 'Frieren' }, { title: 'Bocchi the Rock!' }],
    diary: [{ title: 'Wpis 1' }],
  },
};

/**
 * Installs a fake Electron bridge on `window` so the file picker resolves to a
 * valid ShiroAni export and the dialog advances to its preview step. This is a
 * real browser global (not a Vitest mock), so it works in the addon-vitest run.
 */
function stubFileBridge() {
  const win = window as unknown as { electronAPI?: unknown };
  const prev = win.electronAPI;
  win.electronAPI = {
    dialog: { openFile: async () => '/tmp/shiroani_export.json' },
    file: { readJson: async () => JSON.stringify(VALID_EXPORT) },
  };
  return () => {
    win.electronAPI = prev;
  };
}

const meta = {
  title: 'shared/ImportDialog',
  component: ImportDialog,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    open: { description: 'Whether the dialog is visible.' },
    type: {
      control: 'inline-radio',
      options: ['library', 'diary', 'all'],
      description: 'Which dataset the import targets.',
    },
    onOpenChange: { description: 'Fired with the next open state; suppressed mid-import.' },
  },
} satisfies Meta<typeof ImportDialog>;

export default meta;

type Story = StoryObj<typeof ImportDialog>;

/**
 * Opened import dialog with no Electron bridge present (the Storybook default).
 * The auto-opened file picker is a no-op, so the dialog parks on its idle state.
 */
export const Open: Story = {
  args: { open: true, onOpenChange: fn(), type: 'all' },
};

/**
 * Preview step: a fake file bridge resolves to a valid export so the dialog
 * shows the found-entry summary and the duplicate-strategy radios.
 */
export const Preview: Story = {
  args: { open: true, onOpenChange: fn(), type: 'all' },
  beforeEach: () => stubFileBridge(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await expect(await canvas.findByText(/found/i)).toBeInTheDocument();
    await expect(canvas.getByText('What to do with duplicates?')).toBeInTheDocument();
  },
};

/**
 * Switching the duplicate strategy from the default "skip" to "overwrite".
 */
export const SwitchesStrategy: Story = {
  args: { open: true, onOpenChange: fn(), type: 'all' },
  beforeEach: () => stubFileBridge(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await canvas.findByText(/found/i);
    const overwrite = canvas.getByRole('radio', { name: /overwrite/i });
    await userEvent.click(overwrite);
    await expect(overwrite).toBeChecked();
  },
};
