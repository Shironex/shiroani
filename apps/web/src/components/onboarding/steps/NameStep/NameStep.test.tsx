import { describe, expect, it, beforeEach } from 'vitest';
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
    expect(screen.getByRole('textbox')).toHaveValue('Mochi');
  });

  it('writes typed input back through the settings store', async () => {
    const { user } = render(<NameStep />);
    await user.type(screen.getByRole('textbox'), 'Yuki');
    expect(screen.getByRole('textbox')).toHaveValue('Yuki');
  });
});
