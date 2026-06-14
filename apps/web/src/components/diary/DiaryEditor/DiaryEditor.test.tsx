import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import DiaryEditor from './DiaryEditor';

const noopAsync = vi.fn(async () => true);

describe('DiaryEditor', () => {
  it('renders the new-entry region with a title input', () => {
    render(
      <DiaryEditor entry={null} onClose={vi.fn()} onCreate={noopAsync} onUpdate={noopAsync} />
    );
    // The "new entry" region landmark is present and the title input is focusable.
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('calls onClose when the back button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <DiaryEditor entry={null} onClose={onClose} onCreate={noopAsync} onUpdate={noopAsync} />
    );
    // The back button label appears twice (responsive variants); click the first.
    const backButtons = screen.getAllByLabelText(/back to diary|back/i);
    await user.click(backButtons[0]!);
    expect(onClose).toHaveBeenCalled();
  });
});
