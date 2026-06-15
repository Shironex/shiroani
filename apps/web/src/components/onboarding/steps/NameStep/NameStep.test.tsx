import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DISPLAY_NAME_MAX_LENGTH } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { useSettingsStore } from '@/stores/useSettingsStore';
import NameStep from './NameStep';

beforeEach(() => {
  useSettingsStore.setState({ displayName: '' });
});

describe('NameStep', () => {
  it('reflects the stored display name', () => {
    useSettingsStore.setState({ displayName: 'Mochi' });
    render(<NameStep />);

    expect(screen.getByRole('heading', { name: 'Your name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your name' })).toHaveValue('Mochi');
  });

  it('writes each typed character back through the settings store', async () => {
    const setDisplayName = vi.fn();
    useSettingsStore.setState({ setDisplayName });
    const { user } = render(<NameStep />);

    await user.type(screen.getByRole('textbox', { name: 'Your name' }), 'Yu');

    // The controlled input forwards every keystroke to the store action.
    expect(setDisplayName).toHaveBeenCalledTimes(2);
    expect(setDisplayName).toHaveBeenLastCalledWith('u');
  });

  it('caps the input at DISPLAY_NAME_MAX_LENGTH', () => {
    render(<NameStep />);
    expect(screen.getByRole('textbox', { name: 'Your name' })).toHaveAttribute(
      'maxlength',
      String(DISPLAY_NAME_MAX_LENGTH)
    );
  });
});
