export type SplashVariant = 'loading' | 'updating' | 'error';

export interface ISplashHeroProps {
  variant?: SplashVariant;
  errorMessage?: string | null;
  /**
   * Optional target label shown under the wordmark for the `updating`
   * variant (e.g. the incoming version string: `aktualizacja · v0.6.0`).
   */
  updatingTarget?: string | null;
}

export interface ISplashHeroView {
  readonly isError: boolean;
  /** The mascot image source for the active variant. */
  readonly mascotSrc: string;
  /** Whether the mascot pulse animation should run. */
  readonly animateMascot: boolean;
  /** Whether the rotating ring is rendered (hidden on error per mock). */
  readonly showRing: boolean;
  /** Ring tone for the active variant. */
  readonly tone: 'primary' | 'info' | 'destructive';
  /** Tailwind class for the wordmark emphasis (`Ani`). */
  readonly wordmarkEmClass: string;
  /** Tailwind class for the subtitle row. */
  readonly subClass: string;
  /** Resolved subtitle text for the active variant. */
  readonly subText: string;
  /** Localized mascot alt text. */
  readonly mascotAlt: string;
  /** Localized error paragraph (only meaningful when `isError`). */
  readonly errorText: string;
}
