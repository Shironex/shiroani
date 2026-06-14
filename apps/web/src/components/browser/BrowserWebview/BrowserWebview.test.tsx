import { describe, expect, it, vi } from 'vitest';
import { render } from '@/test/test-utils';

// The webview event wiring touches the Electron <webview> API; stub it so the
// smoke test renders the element without a real guest WebContents.
vi.mock('@/hooks/useWebviewEvents', () => ({
  useWebviewEvents: vi.fn(),
}));

import BrowserWebview from './BrowserWebview';

describe('BrowserWebview', () => {
  it('renders a <webview> with the initial url and partition', () => {
    const { container } = render(
      <BrowserWebview paneId="pane-1" initialUrl="https://example.com" isActive />
    );

    const webview = container.querySelector('webview');
    expect(webview).not.toBeNull();
    expect(webview).toHaveAttribute('src', 'https://example.com');
    expect(webview).toHaveAttribute('partition', 'persist:browser');
  });
});
