import type { DiscoverMedia } from '@/stores/useDiscoverStore';

export interface IRandomPeekChipProps {
  media: DiscoverMedia;
  direction: 'prev' | 'next';
  onClick: () => void;
  inLibrary: boolean;
}

export interface IRandomPeekChipView {
  readonly cover?: string;
  readonly title: string;
  readonly ariaLabel: string;
  readonly arrowLabel: string;
}
