import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { ThemeOption } from '@/lib/theme';
import { ThemeGrid } from '@/components/shared/theme/ThemeGrid';

const themes: ThemeOption[] = [
  {
    value: 'plum' as ThemeOption['value'],
    label: 'Plum',
    color: 'oklch(0.6 0.18 320)',
    isDark: true,
    testId: 't-plum',
  },
  {
    value: 'sakura' as ThemeOption['value'],
    label: 'Sakura',
    color: 'oklch(0.72 0.15 355)',
    isDark: true,
    testId: 't-sakura',
  },
];

describe('ThemeGrid', () => {
  it('renders one swatch per theme and fires onSelect on click', async () => {
    const onSelect = vi.fn();
    const { user } = render(
      <ThemeGrid
        themes={themes}
        label="Dark"
        activeTheme="plum"
        onSelect={onSelect}
        onPreview={() => {}}
        onPreviewEnd={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'Plum' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sakura' }));
    expect(onSelect).toHaveBeenCalledWith('sakura');
  });
});
