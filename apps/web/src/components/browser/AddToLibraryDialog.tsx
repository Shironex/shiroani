import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookmarkPlus, Link2, ImageIcon, Loader2 } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { getWebview } from '@/components/browser/webviewRefs';
import { toast } from 'sonner';
import type { AnimeStatus } from '@shiroani/shared';
import { getStatusOptions } from '@/lib/constants';
import { SCRAPE_METADATA_SCRIPT } from '@/lib/scrape-metadata';
import { useDialogStateMachine } from '@/hooks/useDialogStateMachine';

interface AddToLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

type AddToLibraryStep = { step: 'fetching' } | { step: 'ready' };

export function AddToLibraryDialog({ open, onOpenChange, url, title }: AddToLibraryDialogProps) {
  const { t, i18n } = useTranslation('browser');
  const statusOptions = useMemo(() => getStatusOptions(), [i18n.language]);
  const { addToLibrary } = useLibraryStore();

  const [editableTitle, setEditableTitle] = useState('');
  const [status, setStatus] = useState<AnimeStatus>('plan_to_watch');
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [coverImage, setCoverImage] = useState('');
  const { state, transition } = useDialogStateMachine<AddToLibraryStep>({ step: 'ready' });

  const isFetchingCover = state.step === 'fetching';
  const isCompleted = status === 'completed' && totalEpisodes > 0;

  // Reset form and auto-fetch cover when dialog opens
  useEffect(() => {
    let cancelled = false;
    if (open) {
      setEditableTitle(title || '');
      setStatus('plan_to_watch');
      setCurrentEpisode(0);
      setTotalEpisodes(0);
      setCoverImage('');
      transition({ step: 'ready' });

      // Auto-fetch metadata (cover, title, episodes) from the focused pane
      const activePaneId = useBrowserStore.getState().activePaneId;
      if (activePaneId) {
        const webview = getWebview(activePaneId);
        if (webview) {
          transition({ step: 'fetching' });
          webview
            .executeJavaScript(SCRAPE_METADATA_SCRIPT)
            .then(result => {
              if (cancelled) return;
              const meta = result as {
                coverImage?: string;
                title?: string;
                episodes?: number;
              } | null;
              if (meta) {
                if (meta.coverImage) setCoverImage(meta.coverImage);
                if (meta.title) setEditableTitle(meta.title);
                if (meta.episodes && meta.episodes > 0) setTotalEpisodes(meta.episodes);
              }
            })
            .catch(() => {
              // Non-critical — user can fill in manually
            })
            .finally(() => {
              if (!cancelled) transition({ step: 'ready' });
            });
        }
      }
    }
    return () => {
      cancelled = true;
    };
  }, [open, title, transition]);

  // Auto-set current episode to total when status is completed
  useEffect(() => {
    if (status === 'completed' && totalEpisodes > 0) {
      setCurrentEpisode(totalEpisodes);
    }
  }, [status, totalEpisodes]);

  const handleAdd = useCallback(() => {
    if (!editableTitle.trim()) {
      toast.error(t('addDialog.toast.titleEmpty'));
      return;
    }

    const entries = useLibraryStore.getState().entries;
    const titleMatch = entries.some(
      e => e.title.toLowerCase() === editableTitle.trim().toLowerCase()
    );
    const urlMatch = url && entries.some(e => e.resumeUrl && e.resumeUrl === url);
    if (titleMatch || urlMatch) {
      toast.error(t('addDialog.toast.duplicate'));
      return;
    }

    try {
      addToLibrary({
        title: editableTitle.trim(),
        status,
        currentEpisode: currentEpisode > 0 ? currentEpisode : undefined,
        episodes: totalEpisodes > 0 ? totalEpisodes : undefined,
        coverImage: coverImage.trim() || undefined,
        resumeUrl: url || undefined,
      });

      toast.success(t('addDialog.toast.added'), {
        description: editableTitle.trim(),
      });

      onOpenChange(false);
    } catch {
      toast.error(t('addDialog.toast.failed'));
    }
  }, [
    editableTitle,
    status,
    currentEpisode,
    totalEpisodes,
    coverImage,
    url,
    addToLibrary,
    onOpenChange,
    t,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5 text-primary" />
            {t('addDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('addDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 py-2">
          {/* Cover image preview + URL */}
          <div className="space-y-1.5">
            <label htmlFor="add-lib-cover" className="text-xs font-medium text-muted-foreground">
              {t('addDialog.cover.label')}
            </label>
            <div className="flex items-start gap-3">
              {/* Thumbnail preview */}
              <div className="w-16 h-[86px] rounded-md border border-border overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {isFetchingCover ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : coverImage ? (
                  <img
                    src={coverImage}
                    alt={t('addDialog.cover.alt')}
                    className="w-full h-full object-cover"
                    onError={() => setCoverImage('')}
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <Input
                  id="add-lib-cover"
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  placeholder={t('addDialog.cover.placeholder')}
                  className="h-7 text-xs truncate"
                />
                <p className="text-[10px] text-muted-foreground/50">
                  {isFetchingCover
                    ? t('addDialog.cover.fetchingHint')
                    : coverImage
                      ? t('addDialog.cover.fetchedHint')
                      : t('addDialog.cover.emptyHint')}
                </p>
              </div>
            </div>
          </div>

          {/* URL display */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('addDialog.url.label')}
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border min-w-0 overflow-hidden">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {url || t('addDialog.url.empty')}
              </span>
            </div>
          </div>

          {/* Title input */}
          <div className="space-y-1.5">
            <label htmlFor="add-lib-title" className="text-xs font-medium text-muted-foreground">
              {t('addDialog.titleField.label')}
            </label>
            <Input
              id="add-lib-title"
              value={editableTitle}
              onChange={e => setEditableTitle(e.target.value)}
              placeholder={t('addDialog.titleField.placeholder')}
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          {/* Status select */}
          <div className="space-y-1.5">
            <label htmlFor="add-lib-status" className="text-xs font-medium text-muted-foreground">
              {t('addDialog.status.label')}
            </label>
            <Select value={status} onValueChange={v => setStatus(v as AnimeStatus)}>
              <SelectTrigger id="add-lib-status" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Episodes row */}
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="add-lib-current-ep"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('addDialog.episodes.current')}
              </label>
              <Input
                id="add-lib-current-ep"
                type="number"
                min={0}
                max={9999}
                value={currentEpisode}
                onChange={e => setCurrentEpisode(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-8 text-sm w-24"
                disabled={isCompleted}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="add-lib-total-ep"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('addDialog.episodes.total')}
              </label>
              <Input
                id="add-lib-total-ep"
                type="number"
                min={0}
                max={9999}
                value={totalEpisodes}
                onChange={e => setTotalEpisodes(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="?"
                className="h-8 text-sm w-24"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="min-w-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button size="sm" onClick={handleAdd} disabled={!editableTitle.trim()}>
            <BookmarkPlus className="w-4 h-4" />
            {t('addDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
