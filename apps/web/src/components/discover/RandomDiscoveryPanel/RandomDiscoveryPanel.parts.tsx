import { RandomPeekChip } from '@/components/discover/random/RandomPeekChip';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

interface IShowcaseBackdropProps {
  banner?: string;
}

/** Blurred banner image + accent gradient behind the showcase card. */
export function ShowcaseBackdrop({ banner }: IShowcaseBackdropProps) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden rounded-xl">
      {banner ? (
        <img
          src={banner}
          alt=""
          aria-hidden
          className="w-full h-full object-cover opacity-25 blur-2xl scale-110"
        />
      ) : null}
      {/* News hero-style accent gradient + soft vignette */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(120deg, oklch(from var(--primary) l c h / 0.18), oklch(from var(--primary) l c h / 0.02) 60%), linear-gradient(180deg, transparent, oklch(0 0 0 / 0.35))',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/55 to-background/95" />
    </div>
  );
}

interface IPeekFooterProps {
  peekPrev: DiscoverMedia | null;
  peekNext: DiscoverMedia | null;
  libraryIds: Set<number>;
  onPrev: () => void;
  onNext: () => void;
}

/** The prev/next peek chip row beneath the showcase card. */
export function PeekFooter({ peekPrev, peekNext, libraryIds, onPrev, onNext }: IPeekFooterProps) {
  return (
    <div className="border-t border-border-glass/60 bg-background/20 flex items-center justify-between gap-3 px-4 py-3">
      {peekPrev ? (
        <RandomPeekChip
          media={peekPrev}
          direction="prev"
          onClick={onPrev}
          inLibrary={libraryIds.has(peekPrev.id)}
        />
      ) : (
        <div />
      )}
      {peekNext ? (
        <RandomPeekChip
          media={peekNext}
          direction="next"
          onClick={onNext}
          inLibrary={libraryIds.has(peekNext.id)}
        />
      ) : (
        <div />
      )}
    </div>
  );
}
