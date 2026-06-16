import { addons } from 'storybook/manager-api';
import { shiroaniTheme } from './shiroani-theme';

/**
 * Brand the Storybook manager (sidebar, toolbar, logo) with the ShiroAni plum
 * theme. The matching Docs-page theme is wired in preview.tsx via
 * `parameters.docs.theme` so both halves of the UI share one source of truth.
 */
addons.setConfig({
  theme: shiroaniTheme,
});
