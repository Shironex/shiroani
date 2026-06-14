import type { IFeedLoadingAnimationView } from './FeedLoadingAnimation.types';

/**
 * Purely presentational — the animation derives nothing from state. The thin
 * hook exists to satisfy the component-folder convention.
 */
export function useFeedLoadingAnimation(): IFeedLoadingAnimationView {
  return {};
}
