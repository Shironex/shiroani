import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { MOOD_OPTIONS } from '@/lib/diary-constants';
import MoodPickerPills from './MoodPickerPills';

describe('MoodPickerPills', () => {
  it('renders a button per mood option', () => {
    render(<MoodPickerPills value={undefined} onChange={vi.fn()} size="sm" />);
    expect(screen.getAllByRole('button')).toHaveLength(MOOD_OPTIONS.length);
  });

  it('renders labelled pills in the sm size', () => {
    render(<MoodPickerPills value={undefined} onChange={vi.fn()} size="sm" />);
    expect(screen.getByRole('button', { name: 'Great' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terrible' })).toBeInTheDocument();
  });

  it('keeps the labels as accessible names even in the emoji-only xs size', () => {
    render(<MoodPickerPills value={undefined} onChange={vi.fn()} size="xs" />);
    // Visual label is hidden in xs, but aria-label keeps the name for SR users.
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
  });

  it('marks the active mood with aria-pressed', () => {
    render(<MoodPickerPills value="neutral" onChange={vi.fn()} size="sm" />);
    expect(screen.getByRole('button', { name: 'Neutral' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Great' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits the picked mood when an inactive pill is clicked', async () => {
    const onChange = vi.fn();
    const { user } = render(<MoodPickerPills value={undefined} onChange={onChange} size="sm" />);
    await user.click(screen.getByRole('button', { name: 'Bad' }));
    expect(onChange).toHaveBeenCalledWith('bad');
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
