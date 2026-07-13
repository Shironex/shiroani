import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddToLibraryDialog } from '@/components/browser/AddToLibraryDialog';
import { BrowserTabBar } from '@/components/browser/BrowserTabBar';
import { BrowserToolbar } from '@/components/browser/BrowserToolbar';
import { BrowserFavoritesBar } from '@/components/browser/BrowserFavoritesBar';
import { BrowserWebview } from '@/components/browser/BrowserWebview';
import { FindBar } from '@/components/browser/FindBar';
import { BrowserHistoryDialog } from '@/components/browser/BrowserHistoryDialog';
import { cn } from '@/lib/utils';
import { useBrowserView, slotKeyForTab } from './BrowserView.hooks';
import { renderNode } from './BrowserView.parts';

/**
 * BrowserView: The main embedded browser interface.
 * Renders each top-level tab as a stacked layer (kept mounted across switches
 * to preserve webview state). Within a tab, the tree is rendered recursively —
 * leaves render <BrowserWebview>, splits render a ResizablePanelGroup.
 */
export default function BrowserView() {
  const { t } = useTranslation('browser');
  const {
    tabs,
    activeTabId,
    activePaneId,
    splitTabsEnabled,
    isFullScreen,
    activePane,
    isActivePaneNewTab,
    isCurrentFavorite,
    urlInput,
    setUrlInput,
    isAddToLibraryOpen,
    setIsAddToLibraryOpen,
    isResizing,
    isFindOpen,
    setIsFindOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    urlInputRef,
    webviewLayerRef,
    liveLeaves,
    getOrCreatePaneContainer,
    handleNewTabNavigate,
    handleGoHome,
    handleToggleFavorite,
    handleOpenFavoriteInNewTab,
    handlePaneClick,
    handleSplitterStart,
    handleSplitterEnd,
    openTab,
    closeTab,
    switchTab,
    reorderTabs,
    navigate,
    goBack,
    goForward,
    reload,
    stop,
    splitTabs,
  } = useBrowserView();

  const tabLayers = tabs.map(tab => (
    <div
      key={slotKeyForTab(tab)}
      className={cn('absolute inset-0', tab.id === activeTabId ? 'block' : 'hidden')}
    >
      {renderNode({
        node: tab,
        activePaneId,
        parentSplitId: null,
        resizing: isResizing,
        onSplitterStart: handleSplitterStart,
        onSplitterEnd: handleSplitterEnd,
        onPaneClick: handlePaneClick,
        onNewTabNavigate: handleNewTabNavigate,
        t,
      })}
    </div>
  ));

  const showFindBar = !isFullScreen && isFindOpen;
  const showLoadingBar = !isFullScreen && !!activePane?.isLoading;

  const webviewPortals = liveLeaves.map(leaf =>
    createPortal(
      <BrowserWebview paneId={leaf.id} initialUrl={leaf.url} isActive />,
      getOrCreatePaneContainer(leaf.id),
      leaf.id
    )
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Tab bar — hidden during HTML5 fullscreen */}
      {!isFullScreen && (
        <BrowserTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={switchTab}
          onCloseTab={closeTab}
          onNewTab={() => openTab()}
          onReorderTabs={reorderTabs}
          onSplitTabs={splitTabsEnabled ? splitTabs : undefined}
        />
      )}

      {/* Navigation toolbar — hidden during HTML5 fullscreen */}
      {!isFullScreen && (
        <BrowserToolbar
          urlInput={urlInput}
          committedUrl={activePane?.url ?? ''}
          onUrlInputChange={setUrlInput}
          canGoBack={activePane?.canGoBack ?? false}
          canGoForward={activePane?.canGoForward ?? false}
          isLoading={activePane?.isLoading ?? false}
          hasActiveTab={!!activePane}
          isFavorite={isCurrentFavorite}
          onGoBack={goBack}
          onGoForward={goForward}
          onReload={reload}
          onStop={stop}
          onNavigate={navigate}
          onGoHome={handleGoHome}
          onToggleFavorite={handleToggleFavorite}
          onAddToLibrary={() => setIsAddToLibraryOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          urlInputRef={urlInputRef}
        />
      )}

      {/* Favorites bar — renders only when visible + non-empty; hidden in fullscreen */}
      {!isFullScreen && (
        <BrowserFavoritesBar onNavigate={navigate} onOpenInNewTab={handleOpenFavoriteInNewTab} />
      )}

      {/* In-page find bar (Ctrl+F) — mounted only while active */}
      {showFindBar && <FindBar activePaneId={activePaneId} onClose={() => setIsFindOpen(false)} />}

      {/* Tab content — every tab stays mounted to preserve webview state */}
      <div
        className={`flex-1 relative overflow-hidden ${isActivePaneNewTab ? '' : 'bg-background'}`}
      >
        {/* Indeterminate page-load bar under the toolbar while the active pane
            loads — reuses the shared progress-slide keyframe. */}
        {showLoadingBar && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden"
          >
            <div className="h-full w-1/3 bg-primary [animation:progress-slide_1.2s_ease-in-out_infinite]" />
          </div>
        )}
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Globe className="w-16 h-16 opacity-20" />
            <p className="text-sm">{t('tabs.empty.cta')}</p>
            <Button variant="outline" size="sm" onClick={() => openTab()}>
              <Plus className="w-4 h-4" />
              {t('tabs.empty.action')}
            </Button>
          </div>
        ) : (
          <>
            {tabLayers}
            {/*
             * Stable parent for every pane's webview container. Containers
             * float absolutely inside this layer and are CSS-positioned over
             * their matching slots; the DOM never gets reparented.
             */}
            <div
              ref={webviewLayerRef}
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
            />
          </>
        )}
      </div>

      {/* Browsing history */}
      <BrowserHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        onNavigate={navigate}
      />

      {/* Add to Library dialog */}
      <AddToLibraryDialog
        open={isAddToLibraryOpen}
        onOpenChange={setIsAddToLibraryOpen}
        url={activePane?.url ?? ''}
        title={activePane?.title ?? ''}
      />

      {/*
       * One <BrowserWebview> per live pane, portaled into a stable container
       * that lives in webviewLayer. The portal indirection keeps React's
       * reconciliation tree shape stable across split/unsplit, while the
       * container itself is never reparented for the pane's whole lifetime.
       */}
      {webviewPortals}
    </div>
  );
}
