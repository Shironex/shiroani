import { useCallback, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { BrowserFavorite } from '@shiroani/shared';
import { useBrowserStore } from '@/stores/useBrowserStore';
import type {
  FavoriteMenuPosition,
  FavoriteMenuState,
  IBrowserFavoritesBarView,
} from './BrowserFavoritesBar.types';

/**
 * View-model for the favorites bar: store-backed favorites + visibility, the
 * dnd-kit pointer reorder wiring (pointer-only, mirroring BrowserTabBar), and
 * the local context-menu / rename-dialog UI state.
 */
export function useBrowserFavoritesBar(
  onNavigate: (url: string) => void,
  onOpenInNewTab: (url: string) => void
): IBrowserFavoritesBarView {
  const favorites = useBrowserStore(useShallow(s => s.favorites));
  const favoritesBarVisible = useBrowserStore(s => s.favoritesBarVisible);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [wasDragging, setWasDragging] = useState(false);
  const [menu, setMenu] = useState<FavoriteMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<BrowserFavorite | null>(null);

  // Distance activation so a click (open) doesn't trigger a reorder drag, and
  // the chip's inner buttons stay clickable — same constraint as the tab strip.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setWasDragging(true);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (over && active.id !== over.id) {
      useBrowserStore.getState().reorderFavorites(active.id as string, over.id as string);
    }
    // Defer clearing so the trailing click after a drag is still suppressed.
    requestAnimationFrame(() => setWasDragging(false));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    requestAnimationFrame(() => setWasDragging(false));
  }, []);

  const handleOpen = useCallback(
    (favorite: BrowserFavorite, event: MouseEvent | KeyboardEvent) => {
      // Ctrl/Cmd-click opens in a new tab; plain click navigates the active tab.
      if (event && (event.ctrlKey || event.metaKey)) {
        onOpenInNewTab(favorite.url);
        return;
      }
      onNavigate(favorite.url);
    },
    [onNavigate, onOpenInNewTab]
  );

  const handleOpenInNewTab = useCallback(
    (favorite: BrowserFavorite) => onOpenInNewTab(favorite.url),
    [onOpenInNewTab]
  );

  const openMenu = useCallback((favorite: BrowserFavorite, position: FavoriteMenuPosition) => {
    setMenu({ favorite, position });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  const openRename = useCallback((favorite: BrowserFavorite) => {
    setMenu(null);
    setRenameTarget(favorite);
  }, []);

  const closeRename = useCallback(() => setRenameTarget(null), []);

  const submitRename = useCallback((title: string) => {
    setRenameTarget(prev => {
      if (prev) useBrowserStore.getState().renameFavorite(prev.id, title);
      return null;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    useBrowserStore.getState().removeFavorite(id);
  }, []);

  const activeDragFavorite = activeDragId
    ? (favorites.find(f => f.id === activeDragId) ?? null)
    : null;

  return {
    favorites,
    isVisible: favoritesBarVisible && favorites.length > 0,
    sensors,
    activeDragFavorite,
    wasDragging,
    menu,
    renameTarget,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    handleOpen,
    handleOpenInNewTab,
    openMenu,
    closeMenu,
    openRename,
    closeRename,
    submitRename,
    removeFavorite,
  };
}
