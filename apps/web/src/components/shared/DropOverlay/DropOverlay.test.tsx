import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import { act, render, screen, waitFor } from '@/test/test-utils';
import DropOverlay from './DropOverlay';
import { DROP_ACTIVE_BODY_CLASS } from './DropOverlay.hooks';

const navigateToBrowser = vi.fn();
vi.mock('@/hooks/useNavigateToBrowser', () => ({
  useNavigateToBrowser: () => navigateToBrowser,
}));

vi.mock('@/lib/socket', () => ({
  emitWithErrorHandling: vi.fn(() => new Promise(() => {})),
  getSocket: () => ({ on: vi.fn(), off: vi.fn() }),
}));

const EXPORT_JSON = JSON.stringify({
  version: 1,
  exportedAt: '2026-09-28T00:00:00.000Z',
  source: 'shiroani',
  data: { library: [{ title: 'Frieren' }] },
});

interface DragPayload {
  files?: File[];
  strings?: Record<string, string>;
}

/** Dispatch a drag event on window with a DataTransfer-shaped payload (jsdom has no DragEvent). */
function fireDrag(type: string, { files = [], strings = {} }: DragPayload = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const dataTransfer = {
    files,
    items: files.map(file => ({ kind: 'file', type: file.type })),
    types: [...(files.length ? ['Files'] : []), ...Object.keys(strings)],
    getData: (format: string) => strings[format] ?? '',
    dropEffect: 'none',
  };
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, dataTransfer };
}

const LINK = { strings: { 'text/uri-list': 'https://anilist.co/anime/154587' } };

describe('DropOverlay', () => {
  beforeEach(() => {
    navigateToBrowser.mockReset();
    vi.mocked(toast).mockClear();
    vi.mocked(toast.error).mockClear();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('idle watchdog', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    });

    it('hides the overlay and re-enables webviews when a drag goes quiet for 1 s', () => {
      render(<DropOverlay />);
      fireDrag('dragenter', LINK);
      expect(document.body).toHaveClass(DROP_ACTIVE_BODY_CLASS);

      // No dragleave or drop ever arrives, as when a drag ends outside Chromium.
      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(screen.getByRole('status')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(document.body).not.toHaveClass(DROP_ACTIVE_BODY_CLASS);
    });

    it('keeps the overlay up while dragover keeps arriving', () => {
      render(<DropOverlay />);
      fireDrag('dragenter', LINK);

      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(900);
        });
        fireDrag('dragover', LINK);
      }

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('shows nothing until something is dragged over the window', () => {
    render(<DropOverlay />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces a link while dragging and disables webviews until the drag leaves', () => {
    render(<DropOverlay />);

    fireDrag('dragenter', LINK);
    expect(screen.getByRole('status')).toHaveTextContent('Drop to open the link');
    expect(document.body).toHaveClass(DROP_ACTIVE_BODY_CLASS);

    fireDrag('dragleave', LINK);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass(DROP_ACTIVE_BODY_CLASS);
  });

  it('owns the style rule that stops webviews from taking the drag', () => {
    const { container } = render(<DropOverlay />);
    expect(container.querySelector('style')?.textContent).toContain(
      `body.${DROP_ACTIVE_BODY_CLASS} webview { pointer-events: none`
    );
  });

  it('cancels dragover so Chromium never navigates the app window to the drop', () => {
    render(<DropOverlay />);
    const { event, dataTransfer } = fireDrag('dragover', LINK);
    expect(event.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe('copy');
  });

  it('opens a dropped web link in a browser tab', () => {
    render(<DropOverlay />);
    fireDrag('dragenter', LINK);
    const { event } = fireDrag('drop', LINK);

    expect(event.defaultPrevented).toBe(true);
    expect(navigateToBrowser).toHaveBeenCalledWith('https://anilist.co/anime/154587');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('refuses a javascript: link with a friendly toast', () => {
    render(<DropOverlay />);
    fireDrag('drop', { strings: { 'text/uri-list': 'javascript:alert(1)' } });

    expect(navigateToBrowser).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Not sure what to do with that', {
      description: expect.stringContaining('Links, ShiroAni exports (.json) and images'),
    });
  });

  it('opens the Import dialog prefilled with a dropped export, without the file picker', async () => {
    const openFile = vi.fn();
    vi.stubGlobal('electronAPI', { dialog: { openFile }, file: { readJson: vi.fn() } });
    render(<DropOverlay />);

    fireDrag('drop', {
      files: [new File([EXPORT_JSON], 'shiroani-export.json', { type: 'application/json' })],
    });

    expect(await screen.findByText('What to do with duplicates?')).toBeInTheDocument();
    expect(openFile).not.toHaveBeenCalled();
  });

  it('refuses an oversized JSON file before reading it', () => {
    render(<DropOverlay />);
    const huge = new File(['{}'], 'huge.json', { type: 'application/json' });
    Object.defineProperty(huge, 'size', { value: 51 * 1024 * 1024 });
    const text = vi.spyOn(huge, 'text');

    fireDrag('drop', { files: [huge] });

    expect(toast.error).toHaveBeenCalledWith('This file is too big to import (max 50 MB).');
    expect(text).not.toHaveBeenCalled();
  });

  it('asks what a dropped image should become (no mascot option off Windows)', async () => {
    render(<DropOverlay />);
    fireDrag('drop', { files: [new File(['x'], 'cat.png', { type: 'image/png' })] });

    expect(await screen.findByText('What should this image be?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set as background' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set as mascot sprite' })).not.toBeInTheDocument();
  });

  it('explains that only one file can be dropped at a time', () => {
    render(<DropOverlay />);
    fireDrag('drop', {
      files: [
        new File(['x'], 'a.png', { type: 'image/png' }),
        new File(['y'], 'b.png', { type: 'image/png' }),
      ],
    });

    expect(toast).toHaveBeenCalledWith('Not sure what to do with that', {
      description: 'Drop one file at a time.',
    });
  });

  it('ignores drags that start inside the app', () => {
    render(<DropOverlay />);
    fireDrag('dragstart');
    fireDrag('dragenter', LINK);
    const { event } = fireDrag('drop', LINK);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(event.defaultPrevented).toBe(false);
    expect(navigateToBrowser).not.toHaveBeenCalled();
    fireDrag('dragend');
  });

  it('ignores new drops while a dropped item is waiting for a choice', async () => {
    render(<DropOverlay />);
    fireDrag('drop', { files: [new File(['x'], 'cat.png', { type: 'image/png' })] });
    await screen.findByText('What should this image be?');

    fireDrag('dragenter', LINK);
    const { dataTransfer } = fireDrag('dragover', LINK);
    fireDrag('drop', LINK);

    await waitFor(() => expect(dataTransfer.dropEffect).toBe('none'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(navigateToBrowser).not.toHaveBeenCalled();
  });
});
