import { useState } from 'react';
import type { IImageWithFallbackView } from './ImageWithFallback.types';

/**
 * Tracks the decode-failure state for {@link ImageWithFallback}: the frame shows
 * the bitmap until it either has no `src` or its `load` errors, after which it
 * falls back to the placeholder for the lifetime of that `src`.
 */
export function useImageWithFallback(src?: string): IImageWithFallbackView {
  const [imgError, setImgError] = useState(false);

  return {
    showImage: Boolean(src) && !imgError,
    handleError: () => setImgError(true),
  };
}
