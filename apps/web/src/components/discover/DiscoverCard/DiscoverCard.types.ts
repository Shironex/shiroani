import type { KeyboardEvent, MouseEvent } from 'react';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

export interface IDiscoverCardProps {
  media: DiscoverMedia;
  inLibrary?: boolean;
  onClick?: (media: DiscoverMedia) => void;
  onAddToLibrary?: (media: DiscoverMedia) => void;
}

export interface IDiscoverCardView {
  readonly title: string;
  readonly coverUrl?: string;
  readonly showImage: boolean;
  readonly formatLabel: string | null;
  readonly subtitle: string;
  readonly hasScore: boolean;
  readonly handleClick: () => void;
  readonly handleKeyDown: (e: KeyboardEvent) => void;
  readonly handleImageError: () => void;
  readonly handleAddClick: (e: MouseEvent) => void;
}
