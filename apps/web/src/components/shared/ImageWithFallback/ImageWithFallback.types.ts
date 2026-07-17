import type { ReactNode } from 'react';

export interface IImageWithFallbackProps {
  src?: string;
  alt: string;
  /** Size + radius classes for the frame (e.g. `w-9 h-12 rounded-md`). */
  className?: string;
  /** Icon shown when there's no image or it fails to decode. */
  fallback: ReactNode;
}

export interface IImageWithFallbackView {
  showImage: boolean;
  handleError: () => void;
}
