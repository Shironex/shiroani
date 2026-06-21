jest.mock('electron');
jest.mock('../../store', () => ({ store: { get: jest.fn(() => 'en') } }));
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import {
  buildWebviewContextMenuTemplate,
  type WebviewContextMenuActions,
  type WebviewContextMenuParams,
} from '../webview-context-menu';

const makeActions = (): jest.Mocked<WebviewContextMenuActions> => ({
  goBack: jest.fn(),
  goForward: jest.fn(),
  reload: jest.fn(),
  cut: jest.fn(),
  copy: jest.fn(),
  paste: jest.fn(),
  selectAll: jest.fn(),
  copyLinkURL: jest.fn(),
  openInNewTab: jest.fn(),
  copyImage: jest.fn(),
  inspect: jest.fn(),
});

const emptyParams: WebviewContextMenuParams = {
  linkURL: '',
  srcURL: '',
  mediaType: 'none',
  isEditable: false,
  selectionText: '',
  // editFlags only needs the fields the builder reads.
  editFlags: { canCut: false, canCopy: false, canPaste: false, canSelectAll: false } as never,
};

/** Collect the non-separator item ids in order. */
const ids = (template: ReturnType<typeof buildWebviewContextMenuTemplate>) =>
  template.filter(i => i.type !== 'separator').map(i => i.id);

describe('buildWebviewContextMenuTemplate', () => {
  it('plain page: only navigation + inspect', () => {
    const template = buildWebviewContextMenuTemplate(
      emptyParams,
      { canGoBack: false, canGoForward: false },
      makeActions()
    );
    expect(ids(template)).toEqual(['back', 'forward', 'reload', 'inspect']);
  });

  it('disables back/forward per navigation state', () => {
    const template = buildWebviewContextMenuTemplate(
      emptyParams,
      { canGoBack: true, canGoForward: false },
      makeActions()
    );
    const back = template.find(i => i.id === 'back');
    const forward = template.find(i => i.id === 'forward');
    expect(back?.enabled).toBe(true);
    expect(forward?.enabled).toBe(false);
  });

  it('link context: adds open-in-new-tab + copy-link at the top', () => {
    const actions = makeActions();
    const template = buildWebviewContextMenuTemplate(
      { ...emptyParams, linkURL: 'https://example.com/page' },
      { canGoBack: false, canGoForward: false },
      actions
    );
    expect(ids(template)).toEqual([
      'openLinkInNewTab',
      'copyLink',
      'back',
      'forward',
      'reload',
      'inspect',
    ]);

    template
      .find(i => i.id === 'openLinkInNewTab')
      ?.click?.(undefined as never, undefined as never, undefined as never);
    template
      .find(i => i.id === 'copyLink')
      ?.click?.(undefined as never, undefined as never, undefined as never);
    expect(actions.openInNewTab).toHaveBeenCalledWith('https://example.com/page');
    expect(actions.copyLinkURL).toHaveBeenCalledWith('https://example.com/page');
  });

  it('image context: adds open-image + copy-image bound to srcURL', () => {
    const actions = makeActions();
    const template = buildWebviewContextMenuTemplate(
      { ...emptyParams, mediaType: 'image', srcURL: 'https://cdn.example.com/a.png' },
      { canGoBack: false, canGoForward: false },
      actions
    );
    expect(ids(template)).toContain('openImageInNewTab');
    expect(ids(template)).toContain('copyImage');

    template
      .find(i => i.id === 'openImageInNewTab')
      ?.click?.(undefined as never, undefined as never, undefined as never);
    expect(actions.openInNewTab).toHaveBeenCalledWith('https://cdn.example.com/a.png');
  });

  it('editable field: clipboard items gated by editFlags', () => {
    const template = buildWebviewContextMenuTemplate(
      {
        ...emptyParams,
        isEditable: true,
        editFlags: { canCut: true, canCopy: true, canPaste: false, canSelectAll: true } as never,
      },
      { canGoBack: false, canGoForward: false },
      makeActions()
    );
    expect(template.find(i => i.id === 'cut')?.enabled).toBe(true);
    expect(template.find(i => i.id === 'paste')?.enabled).toBe(false);
    expect(template.find(i => i.id === 'selectAll')?.enabled).toBe(true);
  });

  it('selection without editable still offers copy', () => {
    const template = buildWebviewContextMenuTemplate(
      { ...emptyParams, selectionText: 'hello', editFlags: { canCopy: true } as never },
      { canGoBack: false, canGoForward: false },
      makeActions()
    );
    expect(ids(template)).toContain('copy');
  });
});
