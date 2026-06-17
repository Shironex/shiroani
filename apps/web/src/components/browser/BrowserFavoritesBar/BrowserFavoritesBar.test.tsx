import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BrowserFavorite } from '@shiroani/shared';
import { render, screen, within } from '@/test/test-utils';
import { useBrowserStore } from '@/stores/useBrowserStore';
import BrowserFavoritesBar from './BrowserFavoritesBar';

function fav(id: string, title: string): BrowserFavorite {
  return { id, url: `https://${id}.example`, title, createdAt: 1 };
}

const favorites: BrowserFavorite[] = [fav('a', 'Shinden'), fav('b', 'YouTube')];

function setFavorites(list: BrowserFavorite[], visible = true) {
  useBrowserStore.setState({ favorites: list, favoritesBarVisible: visible });
}

function renderBar(overrides: Partial<React.ComponentProps<typeof BrowserFavoritesBar>> = {}) {
  return render(
    <BrowserFavoritesBar onNavigate={vi.fn()} onOpenInNewTab={vi.fn()} {...overrides} />
  );
}

/** The chip button whose label text matches `title`. */
function getChip(title: string): HTMLElement {
  return screen.getByText(title).closest('button') as HTMLElement;
}

describe('BrowserFavoritesBar', () => {
  beforeEach(() => {
    setFavorites(favorites);
  });

  it('renders a chip per favorite', () => {
    renderBar();
    expect(screen.getByText('Shinden')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('renders nothing when there are no favorites', () => {
    setFavorites([]);
    const { container } = renderBar();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the bar is hidden', () => {
    setFavorites(favorites, false);
    const { container } = renderBar();
    expect(container).toBeEmptyDOMElement();
  });

  it('navigates the active tab on left-click', async () => {
    const onNavigate = vi.fn();
    const { user } = renderBar({ onNavigate });
    await user.click(getChip('Shinden'));
    expect(onNavigate).toHaveBeenCalledWith('https://a.example');
  });

  it('opens in a new tab on Ctrl-click', async () => {
    const onNavigate = vi.fn();
    const onOpenInNewTab = vi.fn();
    const { user } = renderBar({ onNavigate, onOpenInNewTab });

    await user.keyboard('[ControlLeft>]');
    await user.click(getChip('YouTube'));
    await user.keyboard('[/ControlLeft]');

    expect(onOpenInNewTab).toHaveBeenCalledWith('https://b.example');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('removes the focused favorite with the Delete shortcut', async () => {
    const { user } = renderBar();
    getChip('Shinden').focus();
    await user.keyboard('{Delete}');

    expect(screen.queryByText('Shinden')).not.toBeInTheDocument();
    expect(useBrowserStore.getState().favorites.map(f => f.id)).toEqual(['b']);
  });

  it('moves focus to a sibling chip after Delete', async () => {
    const { user } = renderBar();
    getChip('Shinden').focus();
    await user.keyboard('{Delete}');
    // Focus should land on the surviving sibling, not fall back to <body>.
    expect(getChip('YouTube')).toHaveFocus();
  });

  it('closes the context menu on Escape and restores focus to the kebab', async () => {
    const { user } = renderBar();
    const kebab = within(getChip('Shinden').parentElement as HTMLElement).getByRole('button', {
      name: /options/i,
    });
    await user.click(kebab);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(kebab).toHaveFocus();
  });

  it('opens a context menu from the kebab and removes via "Remove"', async () => {
    const { user } = renderBar();

    const kebab = within(getChip('Shinden').parentElement as HTMLElement).getByRole('button', {
      name: /options/i,
    });
    await user.click(kebab);

    const menu = screen.getByRole('menu');
    await user.click(within(menu).getByRole('menuitem', { name: /remove/i }));

    expect(useBrowserStore.getState().favorites.map(f => f.id)).toEqual(['b']);
  });

  it('opens the rename dialog from the context menu', async () => {
    const { user } = renderBar();

    const kebab = within(getChip('YouTube').parentElement as HTMLElement).getByRole('button', {
      name: /options/i,
    });
    await user.click(kebab);
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /rename/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('YouTube')).toBeInTheDocument();
  });

  it('opens a favorite in a new tab from the context menu', async () => {
    const onOpenInNewTab = vi.fn();
    const { user } = renderBar({ onOpenInNewTab });

    const kebab = within(getChip('Shinden').parentElement as HTMLElement).getByRole('button', {
      name: /options/i,
    });
    await user.click(kebab);
    await user.click(
      within(screen.getByRole('menu')).getByRole('menuitem', { name: /open in new tab/i })
    );

    expect(onOpenInNewTab).toHaveBeenCalledWith('https://a.example');
  });
});
