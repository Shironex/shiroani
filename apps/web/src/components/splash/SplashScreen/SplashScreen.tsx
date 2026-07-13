import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { SplashHero, type SplashVariant } from '../SplashHero';
import { SplashFooter } from '../SplashFooter';
import { useSplashScreen } from './SplashScreen.hooks';
import type { ISplashScreenProps } from './SplashScreen.types';

const VARIANT_KANJI: Record<SplashVariant, string> = {
  loading: '白',
  updating: '新',
  error: '失',
};

export default function SplashScreen({ ready, error, onDismissed }: ISplashScreenProps) {
  const {
    isVisible,
    isDismissing,
    variant,
    error: errorMessage,
    updatingTarget,
    showSpinner,
    message,
    messageIndex,
    statusText,
    metaRight,
    version,
    onRetry,
    onClose,
  } = useSplashScreen({ ready, error, onDismissed });

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden',
        'transition-[opacity,transform] duration-600 ease-out',
        isDismissing && 'opacity-0 scale-[1.02]',
        // Deliberate off-scale radius: matches the Electron frameless window
        // chrome's top corners, not a design-token surface.
        IS_ELECTRON && 'rounded-t-[10px]'
      )}
    >
      {/* Dual radial glow — ambient background per splash mock shell. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 55% 40% at 25% 20%, var(--glow-1), transparent 60%)',
            'radial-gradient(ellipse 50% 55% at 90% 95%, var(--glow-2), transparent 55%)',
          ].join(','),
        }}
      />

      {/* Draggable region so the window can still be moved during splash */}
      {IS_ELECTRON && <div className="absolute inset-x-0 top-0 h-8 drag" />}

      <KanjiWatermark kanji={VARIANT_KANJI[variant]} position="tr" size={320} opacity={0.03} />

      <SplashHero variant={variant} errorMessage={errorMessage} updatingTarget={updatingTarget} />

      <SplashFooter
        variant={variant}
        showSpinner={showSpinner}
        message={message}
        messageKey={messageIndex}
        statusText={statusText}
        progressValue={null}
        version={version}
        metaRight={metaRight}
        error={errorMessage}
        onRetry={onRetry}
        onClose={onClose}
      />
    </div>
  );
}
