import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { useStepLayout } from './StepLayout.hooks';
import type { IStepLayoutProps } from './StepLayout.types';

/**
 * Shared two-pane magazine-split layout used by every onboarding step. The left
 * pane holds Shiro-chan's narrative (kanji watermark, serif headline, body copy);
 * the right pane hosts the interactive form card. The left content changes per
 * step but the visual rhythm (typography, kanji, spacing) is shared.
 */
export default function StepLayout({
  kanji,
  headline,
  description,
  stepMarker,
  stepTitle,
  stepIcon,
  stepHint,
  children,
  rightClassName,
}: IStepLayoutProps) {
  const { rightPaneClass } = useStepLayout(rightClassName);

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[1.08fr_1fr]">
      {/* Left pane — narrative */}
      <div className="relative flex min-w-0 flex-col justify-between overflow-hidden px-10 py-10 md:px-12 md:py-12">
        <KanjiWatermark
          kanji={kanji}
          position="bl"
          size={340}
          opacity={0.04}
          className="-left-10 -bottom-20 text-foreground"
        />
        <div className="relative z-[1] max-w-[42ch]">
          <h1 className="mt-6 font-serif text-[38px] font-bold leading-[0.98] tracking-[-0.03em] text-foreground md:text-[46px]">
            {headline}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Right pane — interactive */}
      <div className={rightPaneClass}>
        <div className="border-b border-border-glass pb-3 font-mono text-2xs uppercase tracking-[0.2em] text-muted-foreground">
          {stepMarker}
        </div>
        <h2 className="flex items-center gap-2.5 font-serif text-xl font-bold tracking-[-0.01em] text-foreground">
          {stepIcon && <span className="text-primary text-lg">{stepIcon}</span>}
          {stepTitle}
        </h2>
        {stepHint && (
          <p className="-mt-1 mb-1 text-xs leading-relaxed text-muted-foreground">{stepHint}</p>
        )}
        <div className="flex min-h-0 flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}
