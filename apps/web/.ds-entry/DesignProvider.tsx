// Preview provider for design-sync — mirrors apps/web/.storybook/preview.tsx.
//
// The Storybook decorators (TooltipProvider + I18nextProvider + theme class +
// dormant socket) can't be bundled by the converter because preview.css pulls
// in Tailwind v4 via a CSS `@import`. This component reproduces the same
// runtime context so every design-sync preview renders exactly as the
// reference Storybook does. Wired via cfg.provider in .design-sync/config.json.
import { useLayoutEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { DEFAULT_BUILT_IN_THEME, DARK_THEMES } from '@shiroani/shared';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeSocket } from '@/lib/socket';
import i18n from '@/lib/i18n';

// View hooks attach socket listeners on mount (getSocket throws without a
// singleton). A dormant socket (autoConnect false) never opens a connection.
try {
  initializeSocket(0);
} catch {
  // already initialized — safe to ignore.
}

// Theme tokens are scoped to `:root.<theme>` (and dark themes need the bare
// `dark` class for Tailwind's `dark:` variant). Apply the default built-in
// theme to the document root so the same tokens the app ships with resolve.
const THEME = DEFAULT_BUILT_IN_THEME;
const ROOT_CLASSES = (DARK_THEMES as readonly string[]).includes(THEME) ? [THEME, 'dark'] : [THEME];

export function DesignProvider({ children }: { children?: React.ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const added = ROOT_CLASSES.filter(c => !root.classList.contains(c));
    root.classList.add(...added);
    // The design-sync preview card hardcodes a white body; the app paints the
    // themed surface on the body (bg-background/text-foreground) so dark-theme
    // light text would be invisible on white. Mirror that here.
    const body = document.body;
    const prevBg = body.style.background;
    const prevColor = body.style.color;
    body.style.background = 'var(--background)';
    body.style.color = 'var(--foreground)';
    return () => {
      root.classList.remove(...added);
      body.style.background = prevBg;
      body.style.color = prevColor;
    };
  }, []);
  return (
    <I18nextProvider i18n={i18n}>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </I18nextProvider>
  );
}

export default DesignProvider;
