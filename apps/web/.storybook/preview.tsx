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
import i18n from '@/lib/i18n';
import './preview.css';

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

const preview: Preview = {
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
    withI18n,
    withThemeByClassName({
      themes,
      defaultTheme: DEFAULT_BUILT_IN_THEME,
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
