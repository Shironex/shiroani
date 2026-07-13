import { useTranslation } from 'react-i18next';
import { Pin, X, FileText, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { Eyebrow } from '@/components/shared/Eyebrow';
import { GradientPicker } from '../GradientPicker';
import { MoodPickerPills } from '../MoodPickerPills';
import type { DiaryEntry, DiaryGradient, DiaryMood } from '@shiroani/shared';

interface IEditorRailProps {
  entry: DiaryEntry | null;
  gradientCss: string | undefined;
  coverGradient: DiaryGradient | undefined;
  onCoverGradientChange: (value: DiaryGradient | undefined) => void;
  isPinned: boolean;
  onTogglePinned: () => void;
  mood: DiaryMood | undefined;
  onMoodChange: (value: DiaryMood | undefined) => void;
  tags: string[];
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onTagAdd: () => void;
  onTagRemove: (tag: string) => void;
}

/** The editor's left rail: cover preview, anime link, mood picker, tag input. */
export function EditorRail({
  entry,
  gradientCss,
  coverGradient,
  onCoverGradientChange,
  isPinned,
  onTogglePinned,
  mood,
  onMoodChange,
  tags,
  tagInput,
  onTagInputChange,
  onTagAdd,
  onTagRemove,
}: IEditorRailProps) {
  const { t } = useTranslation('diary');

  return (
    <aside
      className={cn(
        'flex w-[260px] shrink-0 flex-col gap-5 overflow-y-auto',
        'border-r border-border-glass bg-foreground/[0.015] px-5 py-5'
      )}
    >
      {/* Cover preview */}
      <div className="flex flex-col gap-3">
        <Eyebrow>{t('editor.cover')}</Eyebrow>
        <div
          className={cn(
            'relative h-[104px] w-full overflow-hidden rounded-lg border border-white/10',
            'shadow-[0_10px_28px_oklch(0_0_0/0.35)]'
          )}
          style={{ background: gradientCss }}
        >
          {entry?.animeCoverImage && (
            <img
              src={entry.animeCoverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          )}
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 20%, oklch(1 0 0 / 0.22), transparent 55%)',
            }}
          />
          <button
            type="button"
            onClick={onTogglePinned}
            aria-pressed={isPinned}
            aria-label={isPinned ? t('editor.unpinEntry') : t('editor.pinEntry')}
            className={cn(
              'absolute right-2 top-2 grid size-7 place-items-center rounded-md',
              'transition-colors active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isPinned
                ? 'bg-white/25 text-white'
                : 'bg-black/30 text-white/70 hover:bg-black/45 hover:text-white'
            )}
          >
            <Pin className={cn('w-3.5 h-3.5', isPinned && 'fill-current rotate-45')} />
          </button>
        </div>
        <GradientPicker value={coverGradient} onChange={onCoverGradientChange} stacked />
      </div>

      {/* Anime link (read-only summary when present) */}
      {entry?.animeTitle && (
        <div className="flex flex-col gap-1.5">
          <Eyebrow>{t('editor.linkedAnime')}</Eyebrow>
          <div className="flex items-center gap-2 rounded-md border border-border-glass bg-foreground/[0.03] px-3 py-2 text-[12px] text-foreground/85">
            <LinkIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{entry.animeTitle}</span>
          </div>
        </div>
      )}

      {/* Mood picker */}
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('editor.mood')}</Eyebrow>
        <MoodPickerPills value={mood} onChange={onMoodChange} size="sm" />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('editor.tags')}</Eyebrow>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <PillTag
              key={tag}
              variant="accent"
              className="gap-1 border border-primary/30 tracking-[0.04em]"
            >
              #{tag}
              <button
                type="button"
                onClick={() => onTagRemove(tag)}
                aria-label={t('editor.removeTagAriaLabel', { tag })}
                className={cn(
                  'text-primary/70 hover:text-primary rounded-[2px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <X className="w-3 h-3" />
              </button>
            </PillTag>
          ))}
        </div>
        <input
          value={tagInput}
          onChange={e => onTagInputChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              onTagAdd();
            }
          }}
          onBlur={onTagAdd}
          placeholder={t('editor.addTag')}
          aria-label={t('editor.addTagAriaLabel')}
          className={cn(
            'w-full rounded-sm border border-dashed border-border-glass bg-transparent',
            'px-2.5 py-1.5 text-[11px] text-foreground',
            'placeholder:text-muted-foreground/60',
            'focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30'
          )}
        />
      </div>
    </aside>
  );
}

interface IEditorFooterProps {
  isPinned: boolean;
  isOverLimit: boolean;
  isNearLimit: boolean;
  textLength: number;
  maxContentLength: number;
}

/** The editor footer band: format/pin pills and the live character counter. */
export function EditorFooter({
  isPinned,
  isOverLimit,
  isNearLimit,
  textLength,
  maxContentLength,
}: IEditorFooterProps) {
  const { t } = useTranslation('diary');

  return (
    <footer
      className={cn(
        'flex flex-shrink-0 items-center gap-3 border-t border-border-glass',
        'bg-foreground/[0.015] px-7 py-3'
      )}
    >
      <PillTag variant="muted" className="flex items-center gap-1.5">
        <FileText className="w-3 h-3" />
        {t('editor.footerMarkdown')}
      </PillTag>
      {isPinned && (
        <PillTag variant="accent" className="flex items-center gap-1.5">
          <Pin className="w-3 h-3 rotate-45 fill-current" />
          {t('editor.footerPinned')}
        </PillTag>
      )}
      {isOverLimit && (
        <PillTag variant="muted" className="flex items-center gap-1.5 text-destructive">
          {t('editor.limitReached')}
        </PillTag>
      )}
      <span
        className={cn(
          'ml-auto font-mono text-[10px] uppercase tracking-[0.12em] transition-colors',
          isOverLimit
            ? 'font-semibold text-destructive'
            : isNearLimit
              ? 'text-gold'
              : 'text-muted-foreground'
        )}
        aria-live="polite"
      >
        {t('editor.footerCount', {
          count: textLength,
          max: maxContentLength,
        })}
      </span>
    </footer>
  );
}
