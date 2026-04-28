import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Search, SkipBack, SkipForward, Sparkles } from 'lucide-react';
import { findLeafById, useBrowserStore } from '@/stores/useBrowserStore';
import { detectAnimeFromUrl } from '@/lib/anime-detection';
import { getWebview } from '@/components/browser/webviewRefs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('PlayerDock');

const SKIP_FORWARD_SECONDS = 120;
const SKIP_BACKWARD_SECONDS = -10;

type SeekResult = Awaited<
  ReturnType<NonNullable<typeof window.electronAPI>['playerSkip']['seekRelative']>
>;
type ProbeResult = Awaited<
  ReturnType<NonNullable<typeof window.electronAPI>['playerSkip']['probe']>
>;

type DockMessage =
  | { kind: 'idle' }
  | { kind: 'busy'; label: string }
  | { kind: 'seek'; value: SeekResult; label: string }
  | { kind: 'probe'; value: ProbeResult }
  | { kind: 'inject'; value: { ok: boolean; reason?: string; frameUrl?: string }; label: string }
  | { kind: 'error'; message: string };

/**
 * POC floating dock for OP/ED skip — visible only on recognized anime player
 * hosts (ogladajanime.pl / shinden.pl). Three buttons:
 *   - "⏭ Pomiń +120s" — seekRelative(+120)
 *   - "⏪ Cofnij -10s" — seekRelative(-10)
 *   - "🔍 Sprawdź" — probe the frame tree, dump result inline
 *
 * Renderer overlay positioned outside the webview (it's outside the
 * `.pointer-events-none` layer in BrowserView). Disappears when the active
 * tab leaves an anime page or when no Electron API is present (web build).
 */
export function PlayerDock() {
  const tabs = useBrowserStore(useShallow(s => s.tabs));
  const activePaneId = useBrowserStore(s => s.activePaneId);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);

  const [message, setMessage] = useState<DockMessage>({ kind: 'idle' });

  const activeLeaf = useMemo(
    () => (activePaneId ? findLeafById(tabs, activePaneId) : null),
    [tabs, activePaneId]
  );

  const detection = useMemo(() => {
    if (!activeLeaf) return null;
    return detectAnimeFromUrl(activeLeaf.url, activeLeaf.title);
  }, [activeLeaf]);

  // Reset the result panel whenever the active pane changes — stale messages
  // from a previous tab would just be confusing.
  useEffect(() => {
    setMessage({ kind: 'idle' });
  }, [activePaneId]);

  const resolveWebContentsId = useCallback((): number | null => {
    if (!activePaneId) return null;
    const webview = getWebview(activePaneId);
    if (!webview) return null;
    try {
      const id = webview.getWebContentsId();
      return typeof id === 'number' && id > 0 ? id : null;
    } catch (err) {
      logger.warn('getWebContentsId failed', err);
      return null;
    }
  }, [activePaneId]);

  const handleSeek = useCallback(
    async (deltaSeconds: number, label: string) => {
      const api = window.electronAPI?.playerSkip;
      if (!api) {
        setMessage({ kind: 'error', message: 'Brak electronAPI.playerSkip (web build?)' });
        return;
      }
      const wcId = resolveWebContentsId();
      if (wcId === null) {
        setMessage({ kind: 'error', message: 'Nie znaleziono WebContents aktywnego panelu.' });
        return;
      }
      setMessage({ kind: 'busy', label });
      try {
        const value = await api.seekRelative(wcId, deltaSeconds);
        logger.info('seekRelative result', value);
        setMessage({ kind: 'seek', value, label });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('seekRelative threw', err);
        setMessage({ kind: 'error', message: msg });
      }
    },
    [resolveWebContentsId]
  );

  const handleProbe = useCallback(async () => {
    const api = window.electronAPI?.playerSkip;
    if (!api) {
      setMessage({ kind: 'error', message: 'Brak electronAPI.playerSkip (web build?)' });
      return;
    }
    const wcId = resolveWebContentsId();
    if (wcId === null) {
      setMessage({ kind: 'error', message: 'Nie znaleziono WebContents aktywnego panelu.' });
      return;
    }
    setMessage({ kind: 'busy', label: 'Sprawdzam ramki…' });
    try {
      const value = await api.probe(wcId);
      logger.info('probe result', value);
      setMessage({ kind: 'probe', value });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('probe threw', err);
      setMessage({ kind: 'error', message: msg });
    }
  }, [resolveWebContentsId]);

  const handleInject = useCallback(async () => {
    const api = window.electronAPI?.playerSkip;
    if (!api) {
      setMessage({ kind: 'error', message: 'Brak electronAPI.playerSkip (web build?)' });
      return;
    }
    const wcId = resolveWebContentsId();
    if (wcId === null) {
      setMessage({ kind: 'error', message: 'Nie znaleziono WebContents aktywnego panelu.' });
      return;
    }
    setMessage({ kind: 'busy', label: 'Wstrzykuję przycisk w iframe…' });
    try {
      const value = await api.injectButton(wcId, SKIP_FORWARD_SECONDS);
      logger.info('inject result', value);
      setMessage({ kind: 'inject', value, label: `Wstrzyknij +${SKIP_FORWARD_SECONDS}s` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('inject threw', err);
      setMessage({ kind: 'error', message: msg });
    }
  }, [resolveWebContentsId]);

  // Visibility gate: only show on recognized anime hosts and only when the
  // browser isn't in HTML5 fullscreen (the renderer overlay is hidden by the
  // browser chrome anyway, but the dock should still get out of the way).
  if (!detection || isFullScreen) return null;
  if (!window.electronAPI?.playerSkip) return null;

  return (
    <div
      className={cn(
        'absolute bottom-6 right-6 z-50 pointer-events-auto',
        'flex flex-col items-end gap-2'
      )}
      role="region"
      aria-label="Player skip POC"
    >
      {/* Result panel (above buttons so it doesn't push them around) */}
      {message.kind !== 'idle' && (
        <div
          className={cn(
            'max-w-[420px] rounded-[10px] border border-border-glass bg-card/90 backdrop-blur',
            'px-3 py-2 text-[11.5px] leading-relaxed text-foreground shadow-lg',
            'whitespace-pre-wrap break-words'
          )}
        >
          {renderMessage(message)}
        </div>
      )}

      {/* Button cluster */}
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-[12px] border border-border-glass',
          'bg-card/85 backdrop-blur px-2 py-1.5 shadow-xl'
        )}
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSeek(SKIP_BACKWARD_SECONDS, `Cofnij ${SKIP_BACKWARD_SECONDS}s`)}
          aria-label="Cofnij 10 sekund"
        >
          <SkipBack className="size-3.5" />
          Cofnij -10s
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={() => handleSeek(SKIP_FORWARD_SECONDS, `Pomiń +${SKIP_FORWARD_SECONDS}s`)}
          aria-label="Pomiń 120 sekund"
        >
          <SkipForward className="size-3.5" />
          Pomiń +120s
        </Button>
        <Button size="sm" variant="ghost" onClick={handleProbe} aria-label="Sprawdź ramki">
          <Search className="size-3.5" />
          Sprawdź
        </Button>
        <Button size="sm" variant="ghost" onClick={handleInject} aria-label="Wstrzyknij przycisk">
          <Sparkles className="size-3.5" />
          Wstrzyknij
        </Button>
      </div>
    </div>
  );
}

function renderMessage(message: DockMessage): React.ReactNode {
  switch (message.kind) {
    case 'idle':
      return null;

    case 'busy':
      return (
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{message.label}</span> — pracuję…
        </span>
      );

    case 'seek': {
      const v = message.value;
      if (!v.ok) {
        return (
          <>
            <div className="font-semibold text-destructive">{message.label} — błąd</div>
            <div className="text-muted-foreground">{v.reason ?? 'unknown'}</div>
            {v.frameUrl && (
              <div className="text-muted-foreground/70 text-[10.5px]">{v.frameUrl}</div>
            )}
          </>
        );
      }
      return (
        <>
          <div className="font-semibold">{message.label}</div>
          <div className="text-muted-foreground">
            {(v.before ?? 0).toFixed(2)}s → {(v.after ?? 0).toFixed(2)}s
          </div>
          {v.frameUrl && <div className="text-muted-foreground/70 text-[10.5px]">{v.frameUrl}</div>}
        </>
      );
    }

    case 'inject': {
      const v = message.value;
      if (!v.ok) {
        return (
          <>
            <div className="font-semibold text-destructive">Wstrzyknięcie nie powiodło się</div>
            <div className="text-muted-foreground">{v.reason ?? 'unknown'}</div>
          </>
        );
      }
      return (
        <>
          <div className="font-semibold">Wstrzyknięto przycisk +120s</div>
          {v.frameUrl && <div className="text-muted-foreground/70 text-[10.5px]">{v.frameUrl}</div>}
        </>
      );
    }

    case 'probe': {
      const v = message.value;
      const lines: string[] = [];
      lines.push(`Top: ${v.topUrl}`);
      lines.push(
        `Ramki: ${v.frames.length} | Z odtwarzanym wideo: ${v.playingFrameIndices.length}`
      );
      lines.push(`Czas: ${v.durationMs}ms`);
      lines.push('—');
      v.frames.forEach((f, i) => {
        const marker = v.playingFrameIndices.includes(i) ? '▶' : f.detached ? '✗' : '·';
        const videoCount = f.videos.length;
        const playing = f.videos.filter(x => x.playing).length;
        const url = f.url || '<about:blank>';
        const truncated = url.length > 80 ? url.slice(0, 77) + '…' : url;
        lines.push(`${marker} [${i}] vids=${videoCount} (playing=${playing}) ${truncated}`);
        if (f.error) lines.push(`    error: ${f.error}`);
        f.videos.forEach((video, vi) => {
          if (video.playing || video.width > 0) {
            lines.push(
              `    video[${vi}] ${video.width}x${video.height} t=${video.currentTime.toFixed(1)}s/${video.duration.toFixed(1)}s ${video.paused ? 'paused' : 'playing'}`
            );
          }
        });
      });
      return <pre className="font-mono text-[10.5px] leading-snug">{lines.join('\n')}</pre>;
    }

    case 'error':
      return (
        <>
          <div className="font-semibold text-destructive">Błąd</div>
          <div className="text-muted-foreground">{message.message}</div>
        </>
      );
  }
}
