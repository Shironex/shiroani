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

describe('ThemeSwatch', () => {
  it('fires onSelect with the theme value on click', async () => {
    const onSelect = vi.fn();
    const { user } = render(
      <ThemeSwatch
        option={option}
        isActive={false}
        onSelect={onSelect}
        onPreview={() => {}}
        onPreviewEnd={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Sakura' }));
    expect(onSelect).toHaveBeenCalledWith('sakura');
  });

  it('reflects the active state via aria-pressed', () => {
    render(
      <ThemeSwatch
        option={option}
        isActive
        onSelect={() => {}}
        onPreview={() => {}}
        onPreviewEnd={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Sakura' })).toHaveAttribute('aria-pressed', 'true');
  });
});
