import { afterEach, describe, expect, it } from 'vitest';
import {
  findPaneIdByWebContentsId,
  registerWebview,
  unregisterWebview,
  type WebviewElement,
} from './webviewRefs';

/** A registered webview double whose guest has `id`, or throws when not attached. */
function fakeWebview(id: number | 'detached'): WebviewElement {
  return {
    getWebContentsId: () => {
      if (id === 'detached') throw new Error('The WebView must be attached to the DOM');
      return id;
    },
  } as unknown as WebviewElement;
}

describe('findPaneIdByWebContentsId', () => {
  const registered: string[] = [];
  const register = (paneId: string, el: WebviewElement) => {
    registerWebview(paneId, el);
    registered.push(paneId);
  };

  afterEach(() => {
    for (const paneId of registered.splice(0)) unregisterWebview(paneId);
  });

  it('returns the pane whose guest has the id', () => {
    register('pane-a', fakeWebview(7));
    register('pane-b', fakeWebview(8));
    expect(findPaneIdByWebContentsId(8)).toBe('pane-b');
    expect(findPaneIdByWebContentsId(7)).toBe('pane-a');
  });

  it('returns null when no registered guest matches', () => {
    register('pane-a', fakeWebview(7));
    expect(findPaneIdByWebContentsId(99)).toBeNull();
  });

  it('skips guests that are not attached yet', () => {
    register('pane-a', fakeWebview('detached'));
    register('pane-b', fakeWebview(8));
    expect(findPaneIdByWebContentsId(8)).toBe('pane-b');
    expect(findPaneIdByWebContentsId(7)).toBeNull();
  });

  it('forgets a pane once it is unregistered', () => {
    register('pane-a', fakeWebview(7));
    unregisterWebview('pane-a');
    expect(findPaneIdByWebContentsId(7)).toBeNull();
  });
});
