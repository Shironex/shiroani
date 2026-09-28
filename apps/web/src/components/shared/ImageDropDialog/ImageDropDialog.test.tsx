import { describe, expect, it, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { render, screen, waitFor } from '@/test/test-utils';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';
import ImageDropDialog from './ImageDropDialog';

const MB = 1024 * 1024;
const STORED = { ok: true as const, fileName: 'x.png', url: 'shiroani-bg://backgrounds/x.png' };

function pngFile(name = 'wallpaper.png', size?: number): File {
  const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: 'image/png' });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('ImageDropDialog', () => {
  const addBackgroundFromBytes = vi.fn();
  const addSpriteFromBytes = vi.fn();

  beforeEach(() => {
    addBackgroundFromBytes.mockReset().mockResolvedValue(STORED);
    addSpriteFromBytes.mockReset().mockResolvedValue(STORED);
    useBackgroundStore.setState({ addBackgroundFromBytes });
    useMascotSpriteStore.setState({ addSpriteFromBytes });
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    // jsdom has no object URLs; the dialog only needs a string back.
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('renders nothing without a file', () => {
    render(<ImageDropDialog file={null} onClose={() => {}} showMascotOption />);
    expect(screen.queryByText('What should this image be?')).not.toBeInTheDocument();
  });

  it('shows the file, a preview and both choices where the mascot exists', () => {
    render(<ImageDropDialog file={pngFile()} onClose={() => {}} showMascotOption />);
    expect(screen.getByText('What should this image be?')).toBeInTheDocument();
    expect(screen.getByText('wallpaper.png')).toBeInTheDocument();
    expect(screen.getByAltText('Preview of the dropped image')).toHaveAttribute(
      'src',
      'blob:preview'
    );
    expect(screen.getByRole('button', { name: 'Set as background' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set as mascot sprite' })).toBeInTheDocument();
  });

  it('hides the mascot choice where the mascot does not exist', () => {
    render(<ImageDropDialog file={pngFile()} onClose={() => {}} showMascotOption={false} />);
    expect(screen.queryByRole('button', { name: 'Set as mascot sprite' })).not.toBeInTheDocument();
  });

  it('changes nothing until a choice is clicked', () => {
    render(<ImageDropDialog file={pngFile()} onClose={() => {}} showMascotOption />);
    expect(addBackgroundFromBytes).not.toHaveBeenCalled();
    expect(addSpriteFromBytes).not.toHaveBeenCalled();
  });

  it('sends the file bytes as a background and closes on success', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <ImageDropDialog file={pngFile()} onClose={onClose} showMascotOption />
    );

    await user.click(screen.getByRole('button', { name: 'Set as background' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(addBackgroundFromBytes).toHaveBeenCalledWith(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    expect(addSpriteFromBytes).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Background updated.');
  });

  it('sends the file bytes as the mascot sprite', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <ImageDropDialog file={pngFile()} onClose={onClose} showMascotOption />
    );

    await user.click(screen.getByRole('button', { name: 'Set as mascot sprite' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(addSpriteFromBytes).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Mascot sprite updated.');
  });

  it('explains a rejection from main and stays open', async () => {
    addSpriteFromBytes.mockResolvedValue({ ok: false, reason: 'dimensions-too-large' });
    const onClose = vi.fn();
    const { user } = render(
      <ImageDropDialog file={pngFile()} onClose={onClose} showMascotOption />
    );

    await user.click(screen.getByRole('button', { name: 'Set as mascot sprite' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'The image is too large for the mascot (max 2048×2048 px).'
      )
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('refuses an oversized file before reading or sending it', async () => {
    const { user } = render(
      <ImageDropDialog file={pngFile('big.png', 11 * MB)} onClose={() => {}} showMascotOption />
    );

    await user.click(screen.getByRole('button', { name: 'Set as mascot sprite' }));

    expect(toast.error).toHaveBeenCalledWith('The image is too big (max 10 MB).');
    expect(addSpriteFromBytes).not.toHaveBeenCalled();
  });

  it('shows a generic error when saving fails', async () => {
    addBackgroundFromBytes.mockRejectedValue(new Error('ipc down'));
    const { user } = render(
      <ImageDropDialog file={pngFile()} onClose={() => {}} showMascotOption />
    );

    await user.click(screen.getByRole('button', { name: 'Set as background' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't save the image. Please try again.")
    );
  });

  it('closes on cancel without changing anything', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <ImageDropDialog file={pngFile()} onClose={onClose} showMascotOption />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(addBackgroundFromBytes).not.toHaveBeenCalled();
  });
});
