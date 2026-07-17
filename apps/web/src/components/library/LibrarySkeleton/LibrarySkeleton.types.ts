export interface ILibrarySkeletonProps {
  /** Match the placeholder layout to the active view. Defaults to `'grid'`. */
  viewMode?: 'grid' | 'list';
}

export type ILibrarySkeletonView = Record<string, never>;
