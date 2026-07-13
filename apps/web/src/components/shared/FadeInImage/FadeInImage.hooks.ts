import {
  useCallback,
  useState,
  type ForwardedRef,
  type ReactEventHandler,
  type SyntheticEvent,
} from 'react';
import type { IFadeInImageView } from './FadeInImage.types';

export function useFadeInImage(
  forwardedRef: ForwardedRef<HTMLImageElement>,
  onLoad?: ReactEventHandler<HTMLImageElement>
): IFadeInImageView {
  const [loaded, setLoaded] = useState(false);

  // Handles the cached-image case: if the browser already has the bitmap, the
  // callback ref sees `img.complete` on mount and reveals it immediately so a
  // cached image never gets stuck invisible waiting for an `onLoad` that
  // already fired.
  const setRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete) setLoaded(true);
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );

  const handleLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      setLoaded(true);
      onLoad?.(e);
    },
    [onLoad]
  );

  return { loaded, setRef, handleLoad };
}
