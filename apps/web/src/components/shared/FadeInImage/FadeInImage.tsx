import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useFadeInImage } from './FadeInImage.hooks';
import type { IFadeInImageProps } from './FadeInImage.types';

/**
 * A thin `<img>` wrapper that fades the bitmap in once it decodes — starts at
 * `opacity-0` and transitions to full opacity on load, smoothing the pop-in of
 * lazily loaded covers and banners. Forwards every native `<img>` prop (`src`,
 * `alt`, `loading`, `onError`, `className`, …) plus a ref, and handles the
 * cached-image case so an already-decoded image is revealed immediately.
 */
const FadeInImage = forwardRef<HTMLImageElement, IFadeInImageProps>(
  ({ className, onLoad, ...props }, forwardedRef) => {
    const { loaded, setRef, handleLoad } = useFadeInImage(props.src, forwardedRef, onLoad);

    return (
      <img
        ref={setRef}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        {...props}
      />
    );
  }
);
FadeInImage.displayName = 'FadeInImage';

export default FadeInImage;
