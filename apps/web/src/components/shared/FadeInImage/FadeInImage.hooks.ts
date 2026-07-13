import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ForwardedRef,
  type ReactEventHandler,
  type SyntheticEvent,
} from 'react';
import type { IFadeInImageView } from './FadeInImage.types';

export function useFadeInImage(
  src: string | undefined,
  forwardedRef: ForwardedRef<HTMLImageElement>,
  onLoad?: ReactEventHandler<HTMLImageElement>
): IFadeInImageView {
  const [loaded, setLoaded] = useState(false);
  const nodeRef = useRef<HTMLImageElement | null>(null);

  // Handles the cached-image case: if the browser already has the bitmap, the
  // callback ref sees `img.complete` on mount and reveals it immediately so a
  // cached image never gets stuck invisible waiting for an `onLoad` that
  // already fired.
  const setRef = useCallback(
    (node: HTMLImageElement | null) => {
      nodeRef.current = node;
      if (node?.complete) setLoaded(true);
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );

  // Reset the fade whenever `src` changes so a reused element transitions in
  // again instead of hard-swapping bitmaps. Re-derives from `complete` rather
  // than plain `false` because a cached new image may already be decoded by
  // the time this effect runs, and its `load` event would never arrive late.
  useEffect(() => {
    setLoaded(nodeRef.current?.complete ?? false);
  }, [src]);

  const handleLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      setLoaded(true);
      onLoad?.(e);
    },
    [onLoad]
  );

  return { loaded, setRef, handleLoad };
}
