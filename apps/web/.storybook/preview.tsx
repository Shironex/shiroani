import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { withThemeByClassName } from '@storybook/addon-themes';
import type { Decorator, Preview } from '@storybook/react-vite';
import {
  DARK_THEMES,
  LIGHT_THEMES,
  DEFAULT_BUILT_IN_THEME,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from '@shiroani/shared';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeSocket } from '@/lib/socket';
import i18n from '@/lib/i18n';
import { shiroaniTheme } from './shiroani-theme';
import './preview.css';

/**
 * Stories seed Zustand stores directly and never reach the backend, but view
 * hooks still attach socket listeners on mount (initListeners → getSocket),
 * which throws if no socket singleton exists. Initialize a dormant socket
 * (autoConnect is false, so it never opens a connection) so getSocket() resolves
 * cleanly in both the Storybook UI and the addon-vitest browser run.
 */
try {
  initializeSocket(0);
} catch {
  // Already initialized (HMR re-eval / repeated renders) — safe to ignore.
}

/**
 * Built-in theme tokens are scoped to `:root.<theme>`; dark themes additionally
 * need the bare `dark` class for Tailwind's `dark:` variant. The class map is
 * derived from the shared theme lists so the Storybook toolbar stays in sync
 * with the app's source of truth automatically.
 */
const themes: Record<string, string> = {
  ...Object.fromEntries(DARK_THEMES.map(theme => [theme, `${theme} dark`])),
  ...Object.fromEntries(LIGHT_THEMES.map(theme => [theme, theme])),
};

/**
 * Wrap every story in the real renderer i18next instance (already initialized
 * with all 18 namespaces) and drive its language from the toolbar global, so
 * stories render the shipped Polish/English copy rather than raw keys.
 */
const withI18n: Decorator = (Story, context) => {
  const locale = String(context.globals.locale ?? DEFAULT_LANGUAGE);
  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale]);
  return (
    <I18nextProvider i18n={i18n}>
      <Story />
    </I18nextProvider>
  );
};

/**
 * Mirror the app root (main.tsx) and the test harness: wrap every story in a
 * Radix `TooltipProvider` so components that use `<Tooltip>` (heatmaps, icon
 * buttons, badges, sync indicators) render instead of throwing "`Tooltip` must
 * be used within `TooltipProvider`". Nesting is safe — components that supply
 * their own provider (e.g. ActivityHeatmap) still work.
 */
const withTooltip: Decorator = Story => (
  <TooltipProvider delayDuration={300}>
    <Story />
  </TooltipProvider>
);

const preview: Preview = {
  // Generate a Docs page for every component from its args/argTypes + JSDoc.
  tags: ['autodocs'],
  initialGlobals: {
    locale: DEFAULT_LANGUAGE,
  },
  globalTypes: {
    locale: {
      description: 'UI language',
      toolbar: {
        icon: 'globe',
        items: SUPPORTED_LANGUAGES.map(lang => ({ value: lang.code, title: lang.label })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    withTooltip,
    withI18n,
    withThemeByClassName({
      themes,
      defaultTheme: DEFAULT_BUILT_IN_THEME,
    }),
  ],
  parameters: {
    // Brand the Docs pages with the same ShiroAni plum theme as the manager
    // chrome (see .storybook/manager.ts) so autodocs match the dark app surface.
    docs: {
      theme: shiroaniTheme,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Accessibility (axe) runs as part of the Vitest-addon story tests. Default
    // is 'todo' (violations surface as warnings, non-blocking) so the suite is
    // green repo-wide while we ratchet feature-by-feature; audited features set
    // `parameters.a11y.test = 'error'` at the meta level to enforce in CI.
    a11y: {
      test: 'todo',
      // Exclude purely decorative glyphs (e.g. KanjiWatermark) from the axe scan.
      // They are intentionally faint and already `aria-hidden`, so axe's
      // color-contrast check on them is a false positive. The addon concatenates
      // this onto its default excludes and keeps the default (story-root) include.
      context: {
        exclude: [['[data-a11y-decorative]']],
      },
    },
  },
};

export default preview;
