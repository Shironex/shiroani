import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

// Side-effect import: runs `i18next.init()` synchronously before React mounts
// so the first paint already has the correct language. Must precede the
// `createRoot` call below — see `lib/i18n.ts` for the timing rationale.
import '@/lib/i18n';

// Bundled typography — avoids CSP round-trips to fonts.googleapis.com and
// keeps the app readable offline. DM Sans + JetBrains Mono ship as variable
// fonts; Shippori Mincho ships as per-weight files (we only use 700 + 800).
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/shippori-mincho/700.css';
import '@fontsource/shippori-mincho/800.css';

import './styles/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element');
}

createRoot(rootElement).render(
  <StrictMode>
    {/* App-shell boundary — a render throw in the splash, onboarding, title bar,
        or any view subtree surfaces the recovery UI instead of a blank window. */}
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
        <App />
        <Toaster />
      </TooltipProvider>
    </ErrorBoundary>
  </StrictMode>
);
