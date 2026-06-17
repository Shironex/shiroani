import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe, MoreVertical, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { hostFromUrl } from '@/lib/url-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  IFavoriteChipContentProps,
  IFavoriteContextMenuProps,
  IRenameFavoriteDialogProps,
  ISortableFavoriteChipProps,
} from './BrowserFavoritesBar.types';

// Re-export so the SortableContext consumer keeps the strategy colocated.
export { horizontalListSortingStrategy };

const CHIP_CLASS = cn(
  'group/chip relative flex items-center h-[26px] shrink-0 max-w-[180px]',
  'rounded-[7px] border border-transparent',
  'hover:bg-foreground/[0.06] hover:border-border-glass transition-colors'
);

/** Favicon for a favorite chip, falling back to a globe like the tab strip. */
export function FavoriteFavicon({ favicon }: { favicon?: string }) {
  const [imgError, setImgError] = useState(false);
  // Reset the error flag when the favicon URL changes so an updated or reused
  // favorite re-attempts loading instead of being stuck on the fallback globe.
  useEffect(() => setImgError(false), [favicon]);
  if (favicon && !imgError) {
    return (
      <img
        src={favicon}
        alt=""
        className="size-3.5 shrink-0 rounded-[3px]"
        onError={() => setImgError(true)}
      />
    );
  }
  return <Globe className="size-3 shrink-0 opacity-70" />;
}

/** Label shown on a chip: title, falling back to host, then raw URL. */
function chipLabel(favorite: IFavoriteChipContentProps['favorite']): string {
  return favorite.title || hostFromUrl(favorite.url) || favorite.url;
}

/**
 * Presentational chip body (favicon + label), reused by the drag overlay so the
 * dragged chip looks identical to the live one without its interactive parts.
 */
export function FavoriteChipContent({
  favorite,
  isDragOverlay = false,
}: IFavoriteChipContentProps) {
  return (
    <div
      className={cn(
        CHIP_CLASS,
        'gap-1.5 px-2 text-[11.5px] font-medium text-foreground/85',
        isDragOverlay && 'bg-card/90 border-border-glass shadow-lg ring-1 ring-primary/30'
      )}
    >
      <FavoriteFavicon favicon={favorite.favicon} />
      <span className="truncate">{chipLabel(favorite)}</span>
    </div>
  );
}

/**
 * Interactive favorite chip: a draggable list item holding two real buttons —
 * the main open target and an actions kebab. Pointer drag (distance-activated)
 * reorders; the inner buttons stay keyboard-accessible (no tablist/nesting
 * constraint here, unlike the tab strip).
 *  - left-click → open in active tab (Ctrl/Cmd-click → new tab, handled upstream)
 *  - middle-click → open in new tab
 *  - right-click / kebab → context menu (rename, remove, open in new tab)
 *  - Delete / Backspace on the open button → remove
 */
export function SortableFavoriteChip({
  favorite,
  wasDragging,
  onOpen,
  onOpenInNewTab,
  onOpenMenu,
  onRemove,
}: ISortableFavoriteChipProps) {
  const { t } = useTranslation('browser');
  const { setNodeRef, transform, transition, isDragging, listeners } = useSortable({
    id: favorite.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleClick = (e: MouseEvent) => {
    // Suppress the click that trails a drag so a reorder doesn't also navigate.
    if (wasDragging) return;
    onOpen(favorite, e);
  };

  const handleAuxClick = (e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      onOpenInNewTab(favorite);
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    onOpenMenu(favorite, { x: e.clientX, y: e.clientY });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      // Move focus to an adjacent chip before this one unmounts so keyboard
      // focus isn't lost to <body>. The sibling <li> survives the removal.
      const li = e.currentTarget.closest('li');
      const sibling = (li?.nextElementSibling ?? li?.previousElementSibling) as HTMLElement | null;
      onRemove(favorite.id);
      sibling?.querySelector('button')?.focus();
    }
  };

  const handleKebab = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onOpenMenu(favorite, { x: rect.left, y: rect.bottom + 4 });
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      // Pointer-drag reorder only (PointerSensor), matching the tab strip; the
      // inner buttons stay keyboard-operable. Listeners sit on the <li> so the
      // whole chip is a drag handle without wrapping the focusable buttons.
      {...listeners}
      className={cn(CHIP_CLASS, isDragging && 'z-10')}
    >
      <button
        type="button"
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        title={favorite.title || favorite.url}
        aria-keyshortcuts="Delete"
        className={cn(
          'flex min-w-0 items-center gap-1.5 pl-2 pr-1 h-full',
          'text-[11.5px] font-medium text-foreground/85 cursor-pointer outline-none',
          'rounded-l-[7px] focus-visible:ring-2 focus-visible:ring-primary/50'
        )}
      >
        <FavoriteFavicon favicon={favorite.favicon} />
        <span className="truncate">{chipLabel(favorite)}</span>
      </button>
      <button
        type="button"
        onClick={handleKebab}
        aria-label={t('favorites.options', { title: chipLabel(favorite) })}
        className={cn(
          'grid place-items-center size-5 mr-1 rounded-[5px] shrink-0 cursor-pointer',
          'text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.08]',
          'opacity-0 group-hover/chip:opacity-100 focus-visible:opacity-100',
          'focus-visible:ring-2 focus-visible:ring-primary/50 outline-none transition-opacity'
        )}
      >
        <MoreVertical className="size-3.5" />
      </button>
    </li>
  );
}

/**
 * Lightweight context menu for a favorite, portaled to the body and positioned
 * at the trigger point. Hand-rolled (no Radix dependency) but keyboard-complete:
 * first item auto-focused, Arrow Up/Down roving, Escape / outside-click / scroll
 * dismiss. Clamped to stay within the viewport.
 */
export function FavoriteContextMenu({
  favorite,
  position,
  onOpenInNewTab,
  onRename,
  onRemove,
  onClose,
}: IFavoriteContextMenuProps) {
  const { t } = useTranslation('browser');
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState(position);

  // Clamp into the viewport once the menu has a measured size.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const x = Math.max(8, Math.min(position.x, window.innerWidth - width - 8));
    const y = Math.max(8, Math.min(position.y, window.innerHeight - height - 8));
    setCoords({ x, y });
  }, [position]);

  // Focus the first item on open, wire dismissals, and restore focus to the
  // trigger (kebab / chip) on close so keyboard users aren't dropped to <body>.
  useEffect(() => {
    const el = menuRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    el?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();

    const onPointerDown = (e: PointerEvent) => {
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
      // Only restore if the trigger still exists (a removed chip's kebab won't).
      if (trigger?.isConnected) trigger.focus();
    };
  }, [onClose]);

  const items = [
    {
      key: 'newtab',
      label: t('favorites.menu.openNewTab'),
      icon: ExternalLink,
      action: () => {
        onOpenInNewTab(favorite);
        onClose();
      },
    },
    {
      key: 'rename',
      label: t('favorites.menu.rename'),
      icon: Pencil,
      action: () => onRename(favorite),
    },
    {
      key: 'remove',
      label: t('favorites.menu.remove'),
      icon: Trash2,
      danger: true,
      action: () => {
        onRemove(favorite.id);
        onClose();
      },
    },
  ];

  // Keyboard nav handled at the container so it works regardless of which item
  // (if any) holds focus: roving arrows, Home/End, a Tab trap that cycles
  // within the menu instead of escaping behind the portal, and Escape to close.
  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    );
    if (buttons.length === 0) return;
    const focusAt = (idx: number) => {
      buttons[((idx % buttons.length) + buttons.length) % buttons.length].focus();
    };
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusAt(current + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusAt(current - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusAt(0);
        break;
      case 'End':
        e.preventDefault();
        focusAt(-1);
        break;
      case 'Tab':
        e.preventDefault();
        focusAt(current + (e.shiftKey ? -1 : 1));
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      aria-label={t('favorites.menu.label')}
      onKeyDown={handleMenuKeyDown}
      style={{ position: 'fixed', left: coords.x, top: coords.y }}
      className={cn(
        'z-50 min-w-[180px] p-1 rounded-[10px]',
        'bg-popover/95 backdrop-blur-md border border-border-glass shadow-xl',
        'animate-in fade-in-0 zoom-in-95'
      )}
    >
      {items.map(item => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          tabIndex={-1}
          onClick={item.action}
          className={cn(
            'flex w-full items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left',
            'text-[12px] outline-none cursor-pointer transition-colors',
            'focus-visible:bg-foreground/[0.08]',
            item.danger
              ? 'text-status-error/90 hover:bg-status-error/10 focus-visible:bg-status-error/10'
              : 'text-foreground/85 hover:bg-foreground/[0.08]'
          )}
        >
          <item.icon className="size-3.5 shrink-0" />
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

/** Rename dialog for a single favorite; reuses the shared Dialog primitive. */
export function RenameFavoriteDialog({ favorite, onClose, onSubmit }: IRenameFavoriteDialogProps) {
  const { t } = useTranslation('browser');
  const [value, setValue] = useState('');

  // Seed the input from the favorite each time the dialog opens for a new one.
  useEffect(() => {
    if (favorite) setValue(favorite.title);
  }, [favorite]);

  const submit = () => {
    if (value.trim()) onSubmit(value);
  };

  return (
    <Dialog
      open={favorite !== null}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('favorites.rename.title')}</DialogTitle>
          <DialogDescription>{t('favorites.rename.description')}</DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t('favorites.rename.placeholder')}
          aria-label={t('favorites.rename.title')}
          maxLength={120}
          autoFocus
          className="h-8 text-sm"
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button size="sm" onClick={submit} disabled={!value.trim()}>
            {t('favorites.rename.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
