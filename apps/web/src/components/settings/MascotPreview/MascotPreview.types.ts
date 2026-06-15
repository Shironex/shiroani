import type { ReactNode } from 'react';

export interface IMascotPreviewProps {
  current: number;
  min: number;
  max: number;
  /** Optional uppercase caption rendered above the stage (e.g. "Podgląd"). */
  label?: ReactNode;
}

export interface IMascotPreviewView {
  readonly minPx: number;
  readonly currentPx: number;
  readonly maxPx: number;
  readonly spriteUrl: string;
  readonly objectFit: 'contain' | 'cover' | 'fill';
}
