import type { KeyboardEvent, MouseEvent } from 'react';
import type { DragStartEvent, DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import type { BrowserFavorite } from '@shiroani/shared';

/** Screen position for the context menu, in viewport (fixed) coordinates. */
export type FavoriteMenuPosition = {
  x: number;
  y: number;
};

/** Open context-menu state: which favorite and where. */
export type FavoriteMenuState = {
  favorite: BrowserFavorite;
  position: FavoriteMenuPosition;
};

export interface IBrowserFavoritesBarProps {
  /** Navigate the active tab to a favorite's URL (left-click). */
  onNavigate: (url: string) => void;
  /** Open a favorite in a new tab (middle-click / Ctrl-click / menu). */
  onOpenInNewTab: (url: string) => void;
}

export interface IBrowserFavoritesBarView {
  readonly favorites: BrowserFavorite[];
  /** Whether the bar should render at all (visible toggle AND non-empty). */
  readonly isVisible: boolean;
  readonly sensors: SensorDescriptor<SensorOptions>[];
  readonly activeDragFavorite: BrowserFavorite | null;
  readonly wasDragging: boolean;
  readonly menu: FavoriteMenuState | null;
  readonly renameTarget: BrowserFavorite | null;
  readonly handleDragStart: (event: DragStartEvent) => void;
  readonly handleDragEnd: (event: DragEndEvent) => void;
  readonly handleDragCancel: () => void;
  readonly handleOpen: (favorite: BrowserFavorite, event: MouseEvent | KeyboardEvent) => void;
  readonly handleOpenInNewTab: (favorite: BrowserFavorite) => void;
  readonly openMenu: (favorite: BrowserFavorite, position: FavoriteMenuPosition) => void;
  readonly closeMenu: () => void;
  readonly openRename: (favorite: BrowserFavorite) => void;
  readonly closeRename: () => void;
  readonly submitRename: (title: string) => void;
  readonly removeFavorite: (id: string) => void;
}

export interface ISortableFavoriteChipProps {
  favorite: BrowserFavorite;
  wasDragging: boolean;
  onOpen: (favorite: BrowserFavorite, event: MouseEvent | KeyboardEvent) => void;
  onOpenInNewTab: (favorite: BrowserFavorite) => void;
  onOpenMenu: (favorite: BrowserFavorite, position: FavoriteMenuPosition) => void;
  onRemove: (id: string) => void;
}

export interface IFavoriteChipContentProps {
  favorite: BrowserFavorite;
  isDragOverlay?: boolean;
}

export interface IFavoriteContextMenuProps {
  favorite: BrowserFavorite;
  position: FavoriteMenuPosition;
  onOpenInNewTab: (favorite: BrowserFavorite) => void;
  onRename: (favorite: BrowserFavorite) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export interface IRenameFavoriteDialogProps {
  /** The favorite being renamed; `null` keeps the dialog closed. */
  favorite: BrowserFavorite | null;
  onClose: () => void;
  onSubmit: (title: string) => void;
}
