import type { ReactNode } from 'react';

export interface IStepLayoutProps {
  /** Kanji rendered as a faint watermark behind the left pane. */
  kanji: string;
  /** Headline in Shippori Mincho. Accepts JSX so callers can italicise words via <em>. */
  headline: ReactNode;
  /** Supporting paragraph under the headline. */
  description: ReactNode;
  /** Right-pane step marker label (e.g. "Step 02 · Appearance · palette"). */
  stepMarker: ReactNode;
  /** Right-pane title line rendered next to the marker icon. */
  stepTitle: ReactNode;
  /** Optional icon glyph/element shown beside the step title. */
  stepIcon?: ReactNode;
  /** Optional hint rendered under the step title. */
  stepHint?: ReactNode;
  /** Right-pane body — the interactive form card for this step. */
  children: ReactNode;
  /** Additional classes applied to the right-pane scroll container. */
  rightClassName?: string;
}

export interface IStepLayoutView {
  readonly rightPaneClass: string;
}
