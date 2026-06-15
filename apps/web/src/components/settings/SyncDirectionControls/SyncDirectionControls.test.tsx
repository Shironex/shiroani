import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { SyncModeSelector, PushLibraryButton } from './';

describe('SyncDirectionControls', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  describe('SyncModeSelector', () => {
    it('renders the direction modes as an accessible radiogroup', () => {
      render(<SyncModeSelector provider="anilist" value="two-way" onChange={() => {}} />);

      expect(screen.getByRole('radiogroup', { name: 'Sync direction' })).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('marks the active mode as checked', () => {
      render(<SyncModeSelector provider="anilist" value="push" onChange={() => {}} />);
      expect(screen.getByRole('radio', { name: 'Push only' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Two-way' })).not.toBeChecked();
    });

    it('calls onChange with the picked mode', async () => {
      const onChange = vi.fn();
      const { user } = render(
        <SyncModeSelector provider="anilist" value="two-way" onChange={onChange} />
      );
      await user.click(screen.getByRole('radio', { name: 'Pull only' }));
      expect(onChange).toHaveBeenCalledWith('pull');
    });

    it('disables every radio when disabled', () => {
      render(<SyncModeSelector provider="anilist" value="two-way" onChange={() => {}} disabled />);
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toBeDisabled();
      }
    });

    it('shows the active mode hint', () => {
      render(<SyncModeSelector provider="anilist" value="pull" onChange={() => {}} />);
      expect(screen.getByText(/Brings your AniList list into ShiroAni/)).toBeInTheDocument();
    });
  });

  describe('PushLibraryButton', () => {
    it('opens the push dialog and calls onPush with the default create-missing mode', async () => {
      const onPush = vi.fn();
      const { user } = render(<PushLibraryButton provider="anilist" onPush={onPush} />);

      await user.click(screen.getByRole('button', { name: 'Push library…' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Push' }));
      expect(onPush).toHaveBeenCalledWith('create-missing');
    });

    it('pushes with overwrite once that option is picked', async () => {
      const onPush = vi.fn();
      const { user } = render(<PushLibraryButton provider="anilist" onPush={onPush} />);

      await user.click(screen.getByRole('button', { name: 'Push library…' }));
      await screen.findByRole('alertdialog');
      await user.click(screen.getByRole('radio', { name: /Overwrite existing/ }));
      await user.click(screen.getByRole('button', { name: 'Push' }));
      expect(onPush).toHaveBeenCalledWith('overwrite');
    });

    it('does not push when the dialog is cancelled', async () => {
      const onPush = vi.fn();
      const { user } = render(<PushLibraryButton provider="anilist" onPush={onPush} />);

      await user.click(screen.getByRole('button', { name: 'Push library…' }));
      await screen.findByRole('alertdialog');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onPush).not.toHaveBeenCalled();
    });

    it('disables the trigger when disabled', () => {
      render(<PushLibraryButton provider="anilist" onPush={() => {}} disabled />);
      expect(screen.getByRole('button', { name: 'Push library…' })).toBeDisabled();
    });
  });
});
