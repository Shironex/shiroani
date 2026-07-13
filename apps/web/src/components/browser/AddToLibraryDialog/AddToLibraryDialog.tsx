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
import type { AnimeStatus } from '@shiroani/shared';
import { MAX_EPISODES } from '@/lib/constants';
import { useAddToLibraryDialog } from './AddToLibraryDialog.hooks';
import type { IAddToLibraryDialogProps } from './AddToLibraryDialog.types';

export default function AddToLibraryDialog({
  open,
  onOpenChange,
  url,
  title,
}: IAddToLibraryDialogProps) {
  const { t } = useTranslation('browser');
  const {
    statusOptions,
    editableTitle,
    setEditableTitle,
    status,
    setStatus,
    currentEpisode,
    setCurrentEpisode,
    totalEpisodes,
    setTotalEpisodes,
    coverImage,
    setCoverImage,
    isAdding,
    isFetchingCover,
    isCompleted,
    handleAdd,
  } = useAddToLibraryDialog(open, onOpenChange, url, title);

  const statusItems = statusOptions.map(opt => (
    <SelectItem key={opt.value} value={opt.value}>
      {opt.label}
    </SelectItem>
  ));

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
              <SelectContent>{statusItems}</SelectContent>
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
                max={MAX_EPISODES}
                value={currentEpisode}
                onChange={e => setCurrentEpisode(Math.max(0, parseInt(e.target.value, 10) || 0))}
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
                max={MAX_EPISODES}
                value={totalEpisodes}
                onChange={e => setTotalEpisodes(Math.max(0, parseInt(e.target.value, 10) || 0))}
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
          <Button size="sm" onClick={handleAdd} disabled={!editableTitle.trim() || isAdding}>
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BookmarkPlus className="w-4 h-4" />
            )}
            {t('addDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
