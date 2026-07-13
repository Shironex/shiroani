import type { ImgHTMLAttributes, ReactEventHandler } from 'react';

export type IFadeInImageProps = ImgHTMLAttributes<HTMLImageElement>;

export interface IFadeInImageView {
  loaded: boolean;
  setRef: (node: HTMLImageElement | null) => void;
  handleLoad: ReactEventHandler<HTMLImageElement>;
}
