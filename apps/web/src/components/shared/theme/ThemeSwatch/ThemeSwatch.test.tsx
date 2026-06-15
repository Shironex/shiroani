import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { ThemeOption } from '@/lib/theme';
import { ThemeSwatch } from '@/components/shared/theme/ThemeSwatch';

const option: ThemeOption = {
  value: 'sakura' as ThemeOption['value'],
  label: 'Sakura',
  color: 'oklch(0.72 0.15 355)',
  isDark: true,
  testId: 'theme-sakura',
};

function renderSwatch(overrides: Partial<Parameters<typeof ThemeSwatch>[0]> = {}) {
  const onSelect = vi.fn();
  const onPreview = vi.fn();
  const onPreviewEnd = vi.fn();
  const utils = render(
    <ThemeSwatch
      option={option}
      isActive={false}
      onSelect={onSelect}
      onPreview={onPreview}
      onPreviewEnd={onPreviewEnd}
      {...overrides}
    />
  );
  return { ...utils, onSelect, onPreview, onPreviewEnd };
}

describe('ThemeSwatch', () => {
  it('exposes an accessible name from the theme label', () => {
    renderSwatch();
    expect(screen.getByRole('button', { name: 'Sakura' })).toBeInTheDocument();
  });

  it('fires onSelect with the theme value on click', async () => {
    const { user, onSelect } = renderSwatch();
    await user.click(screen.getByRole('button', { name: 'Sakura' }));
    expect(onSelect).toHaveBeenCalledWith('sakura');
  });

  it('is keyboard-activatable — Enter fires onSelect', async () => {
    const { user, onSelect } = renderSwatch();
    screen.getByRole('button', { name: 'Sakura' }).focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('sakura');
  });

  it('fires onPreview on hover and onPreviewEnd on unhover', async () => {
    const { user, onPreview, onPreviewEnd } = renderSwatch();
    const btn = screen.getByRole('button', { name: 'Sakura' });
    await user.hover(btn);
    expect(onPreview).toHaveBeenCalledWith('sakura');
    await user.unhover(btn);
    expect(onPreviewEnd).toHaveBeenCalledTimes(1);
  });

  it('fires onPreview on focus and onPreviewEnd on blur', async () => {
    const { onPreview, onPreviewEnd } = renderSwatch();
    const btn = screen.getByRole('button', { name: 'Sakura' });
    btn.focus();
    expect(onPreview).toHaveBeenCalledWith('sakura');
    btn.blur();
    expect(onPreviewEnd).toHaveBeenCalledTimes(1);
  });

  it('reflects the inactive state via aria-pressed=false', () => {
    renderSwatch({ isActive: false });
    expect(screen.getByRole('button', { name: 'Sakura' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reflects the active state via aria-pressed=true', () => {
    renderSwatch({ isActive: true });
    expect(screen.getByRole('button', { name: 'Sakura' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the active check badge only when active', () => {
    const { container, rerender } = render(
      <ThemeSwatch
        option={option}
        isActive={false}
        onSelect={() => {}}
        onPreview={() => {}}
        onPreviewEnd={() => {}}
      />
    );
    expect(container.querySelector('svg.lucide-check')).not.toBeInTheDocument();

    rerender(
      <ThemeSwatch
        option={option}
        isActive
        onSelect={() => {}}
        onPreview={() => {}}
        onPreviewEnd={() => {}}
      />
    );
    expect(container.querySelector('svg.lucide-check')).toBeInTheDocument();
  });
});
