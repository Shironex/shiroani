import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { DeleteAllDataDialog } from '.';

const mocks = vi.hoisted(() => ({ wipeAllData: vi.fn() }));
vi.mock('@/lib/wipe-all-data', () => ({ wipeAllData: mocks.wipeAllData }));

// EN is the default test language, so the confirmation keyword resolves to "DELETE".
const KEYWORD = 'DELETE';

function setup(overrides: Partial<Parameters<typeof DeleteAllDataDialog>[0]> = {}) {
  const onOpenChange = vi.fn();
  const onExportFirst = vi.fn();
  const utils = render(
    <DeleteAllDataDialog
      open
      onOpenChange={onOpenChange}
      onExportFirst={onExportFirst}
      {...overrides}
    />
  );
  const deleteButton = () => screen.getByRole('button', { name: 'Delete everything' });
  const input = () => screen.getByPlaceholderText(KEYWORD);
  return { ...utils, onOpenChange, onExportFirst, deleteButton, input };
}

describe('DeleteAllDataDialog', () => {
  beforeEach(() => {
    mocks.wipeAllData.mockReset().mockResolvedValue(undefined);
  });

  it('disables the destructive button until the keyword matches', async () => {
    const { user, deleteButton, input } = setup();
    expect(deleteButton()).toBeDisabled();

    await user.type(input(), 'nope');
    expect(deleteButton()).toBeDisabled();
  });

  it('enables the destructive button on a case-insensitive match', async () => {
    const { user, deleteButton, input } = setup();
    await user.type(input(), KEYWORD.toLowerCase());
    expect(deleteButton()).toBeEnabled();
  });

  it('runs the wipe when confirmed with a matching keyword', async () => {
    const { user, deleteButton, input } = setup();
    await user.type(input(), KEYWORD);
    await user.click(deleteButton());
    expect(mocks.wipeAllData).toHaveBeenCalledOnce();
  });

  it('invokes onExportFirst without wiping', async () => {
    const { user, onExportFirst } = setup();
    await user.click(screen.getByRole('button', { name: /Export a backup first/ }));
    expect(onExportFirst).toHaveBeenCalledOnce();
    expect(mocks.wipeAllData).not.toHaveBeenCalled();
  });

  it('surfaces a recoverable error and re-enables the button when the wipe fails', async () => {
    mocks.wipeAllData.mockRejectedValue(new Error('boom'));
    const { user, deleteButton, input } = setup();

    await user.type(input(), KEYWORD);
    await user.click(deleteButton());

    expect(await screen.findByText(/Please try again/)).toBeInTheDocument();
    await waitFor(() => expect(deleteButton()).toBeEnabled());
  });

  it('closes via onOpenChange when Cancel is clicked, without wiping', async () => {
    const { user, onOpenChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.wipeAllData).not.toHaveBeenCalled();
  });

  it('confirms via the Enter key once the keyword matches', async () => {
    const { user, input } = setup();
    await user.type(input(), `${KEYWORD}{Enter}`);
    expect(mocks.wipeAllData).toHaveBeenCalledOnce();
  });

  it('ignores Enter while the keyword does not match', async () => {
    const { user, input } = setup();
    await user.type(input(), 'nope{Enter}');
    expect(mocks.wipeAllData).not.toHaveBeenCalled();
  });
});
