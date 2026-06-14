import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { MOOD_OPTIONS } from '@/lib/diary-constants';
import MoodPickerPills from './MoodPickerPills';

describe('MoodPickerPills', () => {
  it('renders a button per mood option', () => {
    render(<MoodPickerPills value={undefined} onChange={vi.fn()} size="sm" />);
    expect(screen.getAllByRole('button')).toHaveLength(MOOD_OPTIONS.length);
  });

  it('clears the active mood when its pill is clicked again', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <MoodPickerPills value={MOOD_OPTIONS[0]!.value} onChange={onChange} size="sm" />
    );
    const active = screen
      .getAllByRole('button')
      .find(b => b.getAttribute('aria-pressed') === 'true')!;
    await user.click(active);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
