import type { DiscoverMedia } from '@/stores/useDiscoverStore';

export interface IRandomDiscoveryPanelProps {
  libraryIds: Set<number>;
  /** anilistIds to drop from the pool when the exclude toggle is on (item 14). */
  excludedIds: Set<number>;
  onCardClick: (media: DiscoverMedia) => void;
  onError: () => void;
}

export interface IRandomDiscoveryPanelView {
  readonly pool: DiscoverMedia[];
  readonly included: string[];
  readonly excluded: string[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly index: number;
  readonly current: DiscoverMedia | undefined;
  readonly peekPrev: DiscoverMedia | null;
  readonly peekNext: DiscoverMedia | null;
  readonly prev: () => void;
  readonly next: () => void;
  readonly banner?: string;
  readonly showSkeleton: boolean;
  readonly isEmpty: boolean;
  readonly showPeekFooter: boolean;
  readonly handleRefetch: () => void;
  readonly handleGenresChange: (inc: string[], exc: string[]) => void;
  readonly handleAddToLibrary: (media: DiscoverMedia) => Promise<void>;
}
