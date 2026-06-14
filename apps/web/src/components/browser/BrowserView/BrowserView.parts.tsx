import { type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Columns2 } from 'lucide-react';
import { isNewTabUrl, type BrowserLeafNode, type BrowserSplitNode } from '@shiroani/shared';
import { NewTabPage } from '@/components/browser/NewTabPage';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { cn } from '@/lib/utils';
import { PANE_SLOT_ATTR, unsplitTab } from './BrowserView.hooks';
import type { IPaneRendererProps } from './BrowserView.types';

export function PaneChrome({
  leaf,
  parentSplitId,
}: {
  leaf: BrowserLeafNode;
  parentSplitId: string;
}) {
  const { t } = useTranslation('browser');
  return (
    <div
      className={cn(
        'flex items-center gap-2 h-[22px] px-2 shrink-0',
        'bg-[oklch(from_var(--card)_l_c_h/0.55)] border-b border-border-glass',
        'text-[11px] text-muted-foreground'
      )}
    >
      {leaf.favicon ? (
        <img src={leaf.favicon} alt="" className="w-3 h-3 shrink-0 rounded-[2px]" />
      ) : (
        <Globe className="w-3 h-3 shrink-0 opacity-60" />
      )}
      <span className="truncate flex-1">{leaf.title || t('tabs.newTab')}</span>
      <TooltipButton
        variant="ghost"
        size="icon"
        className="size-5 rounded-sm text-muted-foreground hover:text-foreground"
        onClick={e => {
          e.stopPropagation();
          unsplitTab(parentSplitId);
        }}
        tooltip={t('tabs.unsplit')}
        tooltipSide="bottom"
      >
        <Columns2 className="w-3 h-3" />
      </TooltipButton>
    </div>
  );
}

export function renderNode(props: IPaneRendererProps): JSX.Element {
  const { node, activePaneId, parentSplitId, onPaneClick, onNewTabNavigate, t } = props;

  if (node.kind === 'leaf') {
    const isFocused = node.id === activePaneId;
    const showChrome = parentSplitId !== null;
    const isNewTab = isNewTabUrl(node.url);
    return (
      <div
        key={node.id}
        role="region"
        aria-label={showChrome ? t('tabs.region.pane') : t('tabs.region.tab')}
        onMouseDownCapture={() => onPaneClick(node.id)}
        className={cn(
          'relative h-full w-full overflow-hidden flex flex-col',
          isFocused && showChrome && 'ring-1 ring-inset ring-primary/40'
        )}
      >
        {showChrome && <PaneChrome leaf={node} parentSplitId={parentSplitId} />}
        <div className="relative flex-1 overflow-hidden">
          {isNewTab ? (
            // Render NewTabPage inside the leaf so split panes stay scoped:
            // sending one half home/new-tab doesn't cover the other half.
            <NewTabPage onNavigate={url => onNewTabNavigate(node.id, url)} />
          ) : (
            // Measurement target only — the webview overlay reads this rect.
            <div {...{ [PANE_SLOT_ATTR]: node.id }} className="absolute inset-0" />
          )}
        </div>
      </div>
    );
  }

  return renderSplit(node, props);
}

export function renderSplit(split: BrowserSplitNode, props: IPaneRendererProps): JSX.Element {
  const {
    activePaneId,
    onSplitterStart,
    onSplitterEnd,
    resizing,
    onPaneClick,
    onNewTabNavigate,
    t,
  } = props;
  const direction = split.orientation;
  const leftPercent = Math.max(20, Math.min(80, split.ratio * 100));
  const rightPercent = 100 - leftPercent;
  const leftPanelId = `${split.id}-l`;
  const rightPanelId = `${split.id}-r`;

  const handleLayoutChanged = (layout: Record<string, number>) => {
    const leftSize = layout[leftPanelId];
    if (typeof leftSize !== 'number') return;
    useBrowserStore.getState().setSplitRatio(split.id, leftSize / 100);
  };

  return (
    <ResizablePanelGroup
      key={split.id}
      id={split.id}
      orientation={direction}
      onLayoutChanged={handleLayoutChanged}
      className="h-full w-full"
    >
      <ResizablePanel id={leftPanelId} defaultSize={leftPercent} minSize={20}>
        {renderNode({
          node: split.left,
          activePaneId,
          parentSplitId: split.id,
          resizing,
          onSplitterStart,
          onSplitterEnd,
          onPaneClick,
          onNewTabNavigate,
          t,
        })}
      </ResizablePanel>
      <ResizableHandle
        withHandle
        onPointerDownCapture={onSplitterStart}
        onPointerUp={onSplitterEnd}
        onPointerCancel={onSplitterEnd}
      />
      <ResizablePanel id={rightPanelId} defaultSize={rightPercent} minSize={20}>
        {renderNode({
          node: split.right,
          activePaneId,
          parentSplitId: split.id,
          resizing,
          onSplitterStart,
          onSplitterEnd,
          onPaneClick,
          onNewTabNavigate,
          t,
        })}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
