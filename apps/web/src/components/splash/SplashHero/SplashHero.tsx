import { SpinnerRing } from '@/components/ui/spinner-ring';
import { cn } from '@/lib/utils';
import { useSplashHero } from './SplashHero.hooks';
import type { ISplashHeroProps } from './SplashHero.types';

export default function SplashHero({
  variant = 'loading',
  errorMessage,
  updatingTarget,
}: ISplashHeroProps) {
  const {
    isError,
    mascotSrc,
    animateMascot,
    showRing,
    tone,
    wordmarkEmClass,
    subClass,
    subText,
    mascotAlt,
    errorText,
  } = useSplashHero({ variant, errorMessage, updatingTarget });

  const mascotImg = (
    <img
      src={mascotSrc}
      alt={mascotAlt}
      className={cn(
        'w-36 h-36 object-contain drop-shadow-lg',
        animateMascot && 'animate-[splash-pulse_2.4s_ease-in-out_infinite]'
      )}
      draggable={false}
    />
  );

  return (
    <div className="relative flex flex-col items-center justify-center gap-5 px-8 text-center animate-[splash-fade-up_0.8s_ease-out_both]">
      {showRing ? (
        <SpinnerRing size={200} tone={tone}>
          {mascotImg}
        </SpinnerRing>
      ) : (
        <div className="w-[200px] h-[200px] grid place-items-center">{mascotImg}</div>
      )}

      <div className="flex flex-col items-center gap-1.5 animate-[splash-fade-up_0.8s_ease-out_0.2s_both]">
        <div className="font-serif text-[34px] font-extrabold leading-none tracking-[-0.02em] text-foreground">
          Shiro
          <em className={cn('italic', wordmarkEmClass)}>Ani</em>
        </div>
        <div className={cn('font-mono text-[10.5px] uppercase tracking-[0.28em]', subClass)}>
          {subText}
        </div>
      </div>

      {isError && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground animate-[splash-fade-up_0.6s_ease-out_0.4s_both]">
          {errorText}
        </p>
      )}
    </div>
  );
}
