import type { SplashVariant } from '../SplashHero';

/**
 * Structured status row used by the loading + updating variants. Renders as
 *   <dot> action · <b>target</b>
 * which matches the mock's `Synchronizacja · AniList` layout. Numeric detail
 * (e.g. `12.4/36.8 MB`) belongs in `metaRight` on the footer, not here.
 * The footer still falls back to the plain rotating `message` prop when no
 * structured status is provided (keeps backward compat with the loading
 * variant's existing prose rotation).
 */
export interface ISplashStatusText {
  action: string;
  target?: string;
}

export interface ISplashFooterProps {
  variant?: SplashVariant;
  showSpinner: boolean;
  /** Rotating prose message (loading variant fallback). */
  message: string;
  messageKey: number;
  /** Optional structured status — preferred when provided. */
  statusText?: ISplashStatusText | null;
  /** Determinate progress 0–100. Indeterminate when undefined. */
  progressValue?: number | null;
  version: string | null;
  /** Optional right-side meta (e.g. `v0.5.2` or `~18s · 34%`). Falls back to `v{version}`. */
  metaRight?: string | null;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

export interface ISplashFooterView {
  readonly isError: boolean;
  readonly showProgress: boolean;
  readonly progressTone: 'primary' | 'info';
  /** Render the structured status row (vs. the rotating-prose fallback). */
  readonly structured: boolean;
  /** Structured status action text, or null when not structured. */
  readonly statusAction: string | null;
  /** Structured status target label, or null when absent. */
  readonly statusTarget: string | null;
  /** Right-side meta text (metaRight, else `v{version}`, else null). */
  readonly metaText: string | null;
  /** Localized "close" button label. */
  readonly closeLabel: string;
  /** Localized "retry" button label. */
  readonly retryLabel: string;
  /** Localized static "Loading ShiroAni" label for the sr-only live region. */
  readonly loadingLabel: string;
}
