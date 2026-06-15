import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

describe('ConfirmDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Potwierdzenie',
    description: 'Czy na pewno chcesz usunąć?',
    onConfirm: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title and description when open', () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByText('Potwierdzenie')).toBeInTheDocument();
    expect(screen.getByText('Czy na pewno chcesz usunąć?')).toBeInTheDocument();
  });

  it('uses default labels "Delete" and "Cancel"', () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const { user } = render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when cancel button is clicked', async () => {
    const onOpenChange = vi.fn();
    const { user } = render(<ConfirmDialog {...baseProps} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render content when open is false', () => {
    render(<ConfirmDialog {...baseProps} open={false} />);
    expect(screen.queryByText('Potwierdzenie')).not.toBeInTheDocument();
  });

  it('uses custom labels when provided', () => {
    render(<ConfirmDialog {...baseProps} confirmLabel="Tak" cancelLabel="Nie" />);
    expect(screen.getByRole('button', { name: 'Tak' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nie' })).toBeInTheDocument();
  });
});
