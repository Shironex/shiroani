import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import type { IShowcaseMeta } from '../random-utils';

export interface IRandomShowcaseCardProps {
  media: DiscoverMedia;
  index: number;
  total: number;
  inLibrary: boolean;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRefetch: () => void;
  onOpenDetails: () => void;
  onAddToLibrary?: () => void;
}

export interface IRandomShowcaseCardView {
  readonly meta: IShowcaseMeta;
  readonly lqip?: string;
  readonly showRomaji: boolean;
  readonly imgLoaded: boolean;
  readonly setImgLoaded: (loaded: boolean) => void;
  readonly showLqip: boolean;
  readonly showSkeletonShimmer: boolean;
  readonly hasScore: boolean;
  readonly hasGenres: boolean;
  readonly genres: string[];
  readonly showAddButton: boolean;
}
