import { useAppBackground } from './AppBackground.hooks';

/**
 * AppBackground renders the decorative shell backdrop that sits behind every
 * view: two radial glows sourced from the active theme's `--glow-1` / `--glow-2`
 * tokens, plus a subtle SVG fractal-noise overlay with `mix-blend-mode: overlay`.
 *
 * Sits at z-index 0, behind content (z-1) and any user-chosen wallpaper
 * (`BackgroundOverlay`, also z-0 but rendered after this in the DOM when
 * present). The component is purely decorative — `pointer-events: none` and
 * `aria-hidden`.
 */
export default function AppBackground() {
  useAppBackground();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Radial glow layer — uses theme tokens so it restyles with the active theme */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 45% 40% at 20% 10%, var(--glow-1), transparent 60%),' +
            'radial-gradient(ellipse 40% 50% at 90% 80%, var(--glow-2), transparent 55%)',
        }}
      />
      {/* SVG fractal noise overlay — matches .app::after from the mock */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.05,
          mixBlendMode: 'overlay',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
