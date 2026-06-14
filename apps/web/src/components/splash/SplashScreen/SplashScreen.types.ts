import type { SplashVariant } from '../SplashHero';
import type { ISplashStatusText } from '../SplashFooter';

export interface ISplashScreenProps {
  ready: boolean;
  error: string | null;
  onDismissed?: () => void;
}

export interface ISplashScreenView {
  /** Whether the overlay should render at all (false once fully dismissed). */
  readonly isVisible: boolean;
  /** Whether the fade-out exit animation is active. */
  readonly isDismissing: boolean;
  /** Resolved variant (error > updating > loading). */
  readonly variant: SplashVariant;
  /** Active error message passed through from props. */
  readonly error: string | null;
  /** Target version label for the updating hero/footer, or null. */
  readonly updatingTarget: string | null;
  /** Whether the footer spinner/status should be shown yet. */
  readonly showSpinner: boolean;
  /** Current rotating loading message. */
  readonly message: string;
  /** Stable index used as the message swap animation key. */
  readonly messageIndex: number;
  /** Structured status row for the updating variant, or null. */
  readonly statusText: ISplashStatusText | null;
  /** Right-side meta text (version or restarting label), or null. */
  readonly metaRight: string | null;
  /** Installed app version string, or null. */
  readonly version: string | null;
  readonly onRetry: () => void;
  readonly onClose: () => void;
}
