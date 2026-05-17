/**
 * BackgroundOverlay renders a fixed background image behind all app content.
 * It reads CSS custom properties set by the settings store for background image
 * and blur, and reads the opacity value directly from the store as a proper number.
 */
import { useBackgroundStore } from '@/stores/useBackgroundStore';

export function BackgroundOverlay() {
  const backgroundOpacity = useBackgroundStore(s => s.backgroundOpacity);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Background image layer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'var(--app-bg-image)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: backgroundOpacity,
          filter: 'blur(var(--app-bg-blur, 0px))',
        }}
      />
      {/* Semi-transparent overlay for text readability — alpha driven by --app-bg-dim */}
      <div
        className="absolute inset-0 bg-background"
        style={{ opacity: 'var(--app-bg-dim, 0.6)' }}
      />
    </div>
  );
}
