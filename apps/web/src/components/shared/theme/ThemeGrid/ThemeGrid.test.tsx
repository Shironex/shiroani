import { describe, expect, it, vi } from 'vitest';
import { Palette } from 'lucide-react';
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

function renderGrid(overrides: Partial<Parameters<typeof ThemeGrid>[0]> = {}) {
  const onSelect = vi.fn();
  const onPreview = vi.fn();
  const onPreviewEnd = vi.fn();
  const utils = render(
    <ThemeGrid
      themes={themes}
      label="Dark"
      activeTheme={'plum' as ThemeOption['value']}
      onSelect={onSelect}
      onPreview={onPreview}
      onPreviewEnd={onPreviewEnd}
      {...overrides}
    />
  );
  return { ...utils, onSelect, onPreview, onPreviewEnd };
}

describe('ThemeGrid', () => {
  it('renders one swatch button per theme', () => {
    renderGrid();
    expect(screen.getByRole('button', { name: 'Plum' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sakura' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('fires onSelect with the clicked theme value', async () => {
    const { user, onSelect } = renderGrid();
    await user.click(screen.getByRole('button', { name: 'Sakura' }));
    expect(onSelect).toHaveBeenCalledWith('sakura');
  });

  it('marks the active theme via aria-pressed and the others as not pressed', () => {
    renderGrid({ activeTheme: 'sakura' as ThemeOption['value'] });
    expect(screen.getByRole('button', { name: 'Sakura' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Plum' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders the section label, an icon and the theme count', () => {
    renderGrid({ label: 'Dark', icon: Palette });
    expect(screen.getByText('Dark')).toBeInTheDocument();
    // The count badge renders as "· 2".
    expect(screen.getByText(/·\s*2/)).toBeInTheDocument();
  });

  it('forwards preview callbacks from its swatches', async () => {
    const { user, onPreview, onPreviewEnd } = renderGrid();
    const btn = screen.getByRole('button', { name: 'Sakura' });
    await user.hover(btn);
    expect(onPreview).toHaveBeenCalledWith('sakura');
    await user.unhover(btn);
    expect(onPreviewEnd).toHaveBeenCalled();
  });

  it('renders the optional action slot in the header', () => {
    renderGrid({ action: <button type="button">Clone</button> });
    expect(screen.getByRole('button', { name: 'Clone' })).toBeInTheDocument();
  });

  it('renders a trailingOverlay for each swatch', () => {
    renderGrid({
      trailingOverlay: opt => <span data-testid={`overlay-${opt.value}`}>{opt.label}</span>,
    });
    expect(screen.getByTestId('overlay-plum')).toBeInTheDocument();
    expect(screen.getByTestId('overlay-sakura')).toBeInTheDocument();
  });

  it('renders an empty grid without crashing when given no themes', () => {
    renderGrid({ themes: [] });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(/·\s*0/)).toBeInTheDocument();
  });
});
