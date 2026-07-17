import { describe, expect, it, vi } from 'vitest';
import { Star, Plus } from 'lucide-react';
import { render, screen } from '@/test/test-utils';
import { EmptyState } from '@/components/shared/EmptyState';

describe('EmptyState', () => {
  it('renders title and subtitle', () => {
    render(<EmptyState icon={Star} title="Brak wyników" subtitle="Spróbuj zmienić filtry" />);
    expect(screen.getByText('Brak wyników')).toBeInTheDocument();
    expect(screen.getByText('Spróbuj zmienić filtry')).toBeInTheDocument();
  });

  it('renders the action button and calls onClick', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <EmptyState
        icon={Star}
        title="Brak wyników"
        subtitle="Spróbuj zmienić filtry"
        action={{ label: 'Dodaj nowy', onClick, icon: Plus }}
      />
    );
    await user.click(screen.getByRole('button', { name: /Dodaj nowy/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders an action button without an icon when none is supplied', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <EmptyState
        icon={Star}
        title="Brak wyników"
        subtitle="Spróbuj zmienić filtry"
        action={{ label: 'Odśwież', onClick }}
      />
    );
    const button = screen.getByRole('button', { name: 'Odśwież' });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits the action button when no action is provided', () => {
    render(<EmptyState icon={Star} title="Brak wyników" subtitle="Spróbuj zmienić filtry" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the leading icon as decorative so it is hidden from the a11y tree', () => {
    const { container } = render(
      <EmptyState icon={Star} title="Brak wyników" subtitle="Spróbuj zmienić filtry" />
    );
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('recolors the action with destructive tone', () => {
    render(
      <EmptyState
        tone="destructive"
        icon={Star}
        title="Coś poszło nie tak"
        subtitle="Spróbuj ponownie"
        action={{ label: 'Ponów', onClick: vi.fn() }}
      />
    );
    expect(screen.getByRole('button', { name: 'Ponów' }).className).toContain('text-destructive');
  });
});
