import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { useBrowserFavoritesBar } from './BrowserFavoritesBar.hooks';
import {
  SortableFavoriteChip,
  FavoriteChipContent,
  FavoriteContextMenu,
  RenameFavoriteDialog,
  horizontalListSortingStrategy,
} from './BrowserFavoritesBar.parts';
import type { IBrowserFavoritesBarProps } from './BrowserFavoritesBar.types';

/**
 * Browser-style favorites bar rendered under the toolbar: a horizontal row of
 * favicon + title chips. Pointer-drag reorders; left-click opens in the active
 * tab, middle/Ctrl-click opens a new tab, right-click / kebab opens a menu
 * (open in new tab, rename, remove). Renders nothing when hidden or empty.
 */
export default function BrowserFavoritesBar({
  onNavigate,
  onOpenInNewTab,
}: IBrowserFavoritesBarProps) {
  const { t } = useTranslation('browser');
  const {
    favorites,
    isVisible,
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
  } = useBrowserFavoritesBar(onNavigate, onOpenInNewTab);

  if (!isVisible) return null;

  const ids = favorites.map(f => f.id);
  const chips = favorites.map(favorite => (
    <SortableFavoriteChip
      key={favorite.id}
      favorite={favorite}
      wasDragging={wasDragging}
      onOpen={handleOpen}
      onOpenInNewTab={handleOpenInNewTab}
      onOpenMenu={openMenu}
      onRemove={removeFavorite}
    />
  ));

  return (
    <nav
      aria-label={t('favorites.barLabel')}
      className={cn(
        'flex items-center gap-0.5 h-[32px] px-2 shrink-0 overflow-x-auto scrollbar-hide',
        'bg-[oklch(from_var(--card)_l_c_h/0.35)] border-b border-border-glass'
      )}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <ul className="flex items-center gap-0.5">{chips}</ul>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeDragFavorite ? (
            <FavoriteChipContent favorite={activeDragFavorite} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {menu && (
        <FavoriteContextMenu
          favorite={menu.favorite}
          position={menu.position}
          onOpenInNewTab={handleOpenInNewTab}
          onRename={openRename}
          onRemove={removeFavorite}
          onClose={closeMenu}
        />
      )}

      <RenameFavoriteDialog favorite={renameTarget} onClose={closeRename} onSubmit={submitRename} />
    </nav>
  );
}
