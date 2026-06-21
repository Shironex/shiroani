import { Menu, clipboard } from 'electron';
import type {
  BrowserWindow,
  ContextMenuParams,
  MenuItemConstructorOptions,
  WebContents,
} from 'electron';
import { t } from '../i18n-strings';

/**
 * Right-click context menu for the built-in browser's `<webview>` guests.
 *
 * The guest renders third-party pages, so we can't inject a themed React menu
 * without scripting every page; instead we use a native Electron menu built
 * from the `context-menu` event params. Labels come from the main-process i18n
 * dictionary (the same one the tray uses) so they follow the UI language.
 */

/** Navigation state read off the guest at the moment of the right-click. */
export interface WebviewNavState {
  canGoBack: boolean;
  canGoForward: boolean;
}

/** Side-effect callbacks the menu items bind to. Injected so the template
 *  builder stays pure and unit-testable without an Electron runtime. */
export interface WebviewContextMenuActions {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  cut: () => void;
  copy: () => void;
  paste: () => void;
  selectAll: () => void;
  copyLinkURL: (url: string) => void;
  openInNewTab: (url: string) => void;
  copyImage: () => void;
  inspect: () => void;
}

/** The slice of `ContextMenuParams` the template depends on. */
export type WebviewContextMenuParams = Pick<
  ContextMenuParams,
  'linkURL' | 'srcURL' | 'mediaType' | 'isEditable' | 'editFlags' | 'selectionText'
>;

/**
 * Build the menu template from the right-click context. Most-specific actions
 * first (link → image → edit), then navigation, then inspect. Each conditional
 * group emits its own trailing separator; the navigation group is always last
 * and never leads with one, so no double separators appear.
 *
 * Pure: returns plain template objects with `click` handlers bound to `actions`.
 */
export function buildWebviewContextMenuTemplate(
  params: WebviewContextMenuParams,
  nav: WebviewNavState,
  actions: WebviewContextMenuActions
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [];

  const hasLink = !!params.linkURL;
  const isImage = params.mediaType === 'image' && !!params.srcURL;
  const hasSelection = !!params.selectionText?.trim();
  const flags = params.editFlags;

  if (hasLink) {
    template.push(
      {
        id: 'openLinkInNewTab',
        label: t('browserMenu.openLinkInNewTab'),
        click: () => actions.openInNewTab(params.linkURL),
      },
      {
        id: 'copyLink',
        label: t('browserMenu.copyLink'),
        click: () => actions.copyLinkURL(params.linkURL),
      },
      { type: 'separator' }
    );
  }

  if (isImage) {
    template.push(
      {
        id: 'openImageInNewTab',
        label: t('browserMenu.openImageInNewTab'),
        click: () => actions.openInNewTab(params.srcURL),
      },
      {
        id: 'copyImage',
        label: t('browserMenu.copyImage'),
        click: () => actions.copyImage(),
      },
      { type: 'separator' }
    );
  }

  // Clipboard items appear for editable fields or when there is a selection;
  // each is gated by the matching editFlag so e.g. Paste greys out when the
  // clipboard is empty or the target isn't editable.
  if (params.isEditable || hasSelection) {
    template.push(
      {
        id: 'cut',
        label: t('browserMenu.cut'),
        enabled: !!flags?.canCut,
        click: () => actions.cut(),
      },
      {
        id: 'copy',
        label: t('browserMenu.copy'),
        enabled: !!flags?.canCopy,
        click: () => actions.copy(),
      },
      {
        id: 'paste',
        label: t('browserMenu.paste'),
        enabled: !!flags?.canPaste,
        click: () => actions.paste(),
      },
      {
        id: 'selectAll',
        label: t('browserMenu.selectAll'),
        // canSelectAll is true on most surfaces; treat an absent flag as enabled.
        enabled: flags?.canSelectAll !== false,
        click: () => actions.selectAll(),
      },
      { type: 'separator' }
    );
  }

  template.push(
    {
      id: 'back',
      label: t('browserMenu.back'),
      enabled: nav.canGoBack,
      click: () => actions.goBack(),
    },
    {
      id: 'forward',
      label: t('browserMenu.forward'),
      enabled: nav.canGoForward,
      click: () => actions.goForward(),
    },
    {
      id: 'reload',
      label: t('browserMenu.reload'),
      click: () => actions.reload(),
    },
    { type: 'separator' },
    {
      id: 'inspect',
      label: t('browserMenu.inspect'),
      click: () => actions.inspect(),
    }
  );

  return template;
}

/**
 * Wire the native context menu onto a webview guest's webContents.
 *
 * @param webContents  the guest webContents (from `did-attach-webview`)
 * @param mainWindow   the embedder window — anchors the popup. Passed in rather
 *                     than derived via `BrowserWindow.fromWebContents`, which
 *                     returns null for a guest `<webview>`'s webContents.
 * @param openInNewTab callback to open a URL in a new browser tab — already
 *                     validated against the external-URL allowlist by the caller
 */
export function attachWebviewContextMenu(
  webContents: WebContents,
  mainWindow: BrowserWindow,
  openInNewTab: (url: string) => void
): void {
  webContents.on('context-menu', (_event, params) => {
    if (webContents.isDestroyed() || mainWindow.isDestroyed()) return;

    const history = webContents.navigationHistory;
    const template = buildWebviewContextMenuTemplate(
      params,
      { canGoBack: history.canGoBack(), canGoForward: history.canGoForward() },
      {
        goBack: () => history.goBack(),
        goForward: () => history.goForward(),
        reload: () => webContents.reload(),
        cut: () => webContents.cut(),
        copy: () => webContents.copy(),
        paste: () => webContents.paste(),
        selectAll: () => webContents.selectAll(),
        copyLinkURL: url => clipboard.writeText(url),
        openInNewTab,
        copyImage: () => webContents.copyImageAt(params.x, params.y),
        inspect: () => webContents.inspectElement(params.x, params.y),
      }
    );

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });
}
