import { useEffect, useState } from 'react';
import type { IFeedLoadingAnimationView } from './FeedLoadingAnimation.types';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the user's reduced-motion preference so the SVG can drop its SMIL
 * loops (`<animate>` / `<animateTransform>`), which the global CSS
 * `prefers-reduced-motion` rule cannot reach. Renders a static composition when
 * reduced motion is requested.
 */
export function useFeedLoadingAnimation(): IFeedLoadingAnimationView {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    setReducedMotion(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return { reducedMotion };
}
