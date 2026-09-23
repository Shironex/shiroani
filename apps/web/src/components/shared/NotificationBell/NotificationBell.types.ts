import type { RefObject } from 'react';

export interface INotificationBellView {
  readonly connected: boolean;
  readonly open: boolean;
  readonly hasUnread: boolean;
  /** Capped unread count for the badge (e.g. `99+`). */
  readonly badge: string;
  readonly label: string;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly buttonRef: RefObject<HTMLButtonElement | null>;
  readonly onToggle: () => void;
  readonly onClose: () => void;
}
