import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { ArrowLeft, Check, Pin, X, FileText, Link as LinkIcon, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PillTag } from '@/components/ui/pill-tag';
import { EditorToolbar } from './EditorToolbar';
import { BubbleMenuBar } from './BubbleMenuBar';
import { GradientPicker } from './GradientPicker';
import { MoodPickerPills } from './MoodPickerPills';
import type {
  DiaryEntry,
  DiaryCreatePayload,
  DiaryUpdatePayload,
  DiaryMood,
  DiaryGradient,
} from '@shiroani/shared';
import { DIARY_GRADIENTS } from '@/lib/diary-constants';
import { isEditableTarget } from '@/lib/is-editable-target';

const MAX_CONTENT_LENGTH = 2000;

interface DiaryEditorProps {
  entry: DiaryEntry | null;
  onClose: () => void;
  /** Resolves `true` when persisted; `false` keeps the editor open (input preserved). */
  onCreate: (payload: DiaryCreatePayload) => Promise<boolean>;
  onUpdate: (payload: DiaryUpdatePayload) => Promise<boolean>;
}

/**
 * Inline diary editor — takes over the whole Diary view body when active
 * (not a modal). Matches the mock's "EDYTOR" page layout: back button,
 * editable title + action cluster up top, toolbar band, Tiptap body.
 *
 * Left rail: poster/gradient picker, anime link summary, mood + tag inputs,
 * and the pin toggle. Right side: title input, Tiptap toolbar, editor body.
 *
 * All Tiptap extensions, content JSON and keyboard shortcuts are preserved
 * exactly as before — this component only restyles the chrome around the
 * editor engine.
 */
export function DiaryEditor({ entry, onClose, onCreate, onUpdate }: DiaryEditorProps) {
  const { t, i18n } = useTranslation('diary');
  const isEditing = !!entry;
  const [title, setTitle] = useState(entry?.title ?? '');
  const [coverGradient, setCoverGradient] = useState<DiaryGradient | undefined>(
    entry?.coverGradient
  );
  const [mood, setMood] = useState<DiaryMood | undefined>(entry?.mood);
  const [isPinned, setIsPinned] = useState(entry?.isPinned ?? false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const initialContent = useMemo(() => {
    if (!entry?.contentJson) return undefined;
    try {
      return JSON.parse(entry.contentJson);
    } catch {
      return undefined;
    }
  }, [entry?.contentJson]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: t('editor.placeholder'),
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: cn(
          'diary-prose min-h-full px-10 py-8 focus:outline-none',
          'text-[14px] leading-[1.7] text-foreground/90'
        ),
      },
    },
  });

  const handleSave = useCallback(async () => {
    if (!editor || isSaving) return;
    // Silent-bail when over the cap — the footer counter already turns red,
    // so the user sees why the save button "doesn't do anything".
    if (editor.getText().length > MAX_CONTENT_LENGTH) return;
    const contentJson = JSON.stringify(editor.getJSON());

    // Await the persist outcome and only close on success — a failed save keeps
    // the editor (and the user's written content) on screen instead of
    // discarding it. The store surfaces the failure toast.
    setIsSaving(true);
    try {
      const ok = isEditing
        ? await onUpdate({
            id: entry!.id,
            title,
            contentJson,
            coverGradient: coverGradient ?? null,
            mood: mood ?? null,
            tags: tags.length > 0 ? tags : null,
            isPinned,
          })
        : await onCreate({
            title: title || t('editor.defaultTitle'),
            contentJson,
            coverGradient,
            mood,
            tags: tags.length > 0 ? tags : undefined,
          });
      if (ok) onClose();
    } finally {
      setIsSaving(false);
    }
  }, [
    editor,
    isSaving,
    title,
    coverGradient,
    mood,
    tags,
    isPinned,
    isEditing,
    entry,
    onCreate,
    onUpdate,
    onClose,
    t,
  ]);

  const handleTagAdd = useCallback(() => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleTagRemove = useCallback(
    (tag: string) => setTags(prev => prev.filter(t => t !== tag)),
    []
  );

  // Re-read on each render — `useEditor` subscribes and triggers re-renders
  // on editor state changes, so this stays live without extra plumbing.
  const textLength = editor?.getText().length ?? 0;
  const isOverLimit = textLength > MAX_CONTENT_LENGTH;
  // Warn once the user is within the final 10% of the budget so the red
  // "save disabled" state never appears without a prior heads-up.
  const isNearLimit = !isOverLimit && textLength >= MAX_CONTENT_LENGTH * 0.9;

  const gradientCss = coverGradient
    ? DIARY_GRADIENTS[coverGradient]?.css
    : 'linear-gradient(150deg, oklch(0.42 0.12 280), oklch(0.28 0.1 330))';

  // Esc closes the editor — matches Radix Dialog's old behaviour so existing
  // muscle memory still works now that we're inline instead of modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Let contentEditable / select fields swallow Escape before we close.
        if (isEditableTarget(e.target)) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      role="region"
      aria-label={isEditing ? t('editor.regionEdit') : t('editor.regionNew')}
      className="flex h-full w-full overflow-hidden animate-fade-in"
    >
      {/* ── Left rail ────────────────────────────────── */}
      <aside
        className={cn(
          'flex w-[260px] shrink-0 flex-col gap-5 overflow-y-auto',
          'border-r border-border-glass bg-foreground/[0.015] px-5 py-5'
        )}
      >
        {/* Cover preview */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('editor.cover')}
          </span>
          <div
            className={cn(
              'relative h-[104px] w-full overflow-hidden rounded-[10px] border border-white/10',
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
              onClick={() => setIsPinned(p => !p)}
              aria-pressed={isPinned}
              aria-label={isPinned ? t('editor.unpinEntry') : t('editor.pinEntry')}
              className={cn(
                'absolute right-2 top-2 grid size-7 place-items-center rounded-[7px]',
                'transition-colors',
                isPinned
                  ? 'bg-white/25 text-white'
                  : 'bg-black/30 text-white/70 hover:bg-black/45 hover:text-white'
              )}
            >
              <Pin className={cn('w-3.5 h-3.5', isPinned && 'fill-current rotate-45')} />
            </button>
          </div>
          <GradientPicker value={coverGradient} onChange={setCoverGradient} stacked />
        </div>

        {/* Anime link (read-only summary when present) */}
        {entry?.animeTitle && (
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t('editor.linkedAnime')}
            </span>
            <div className="flex items-center gap-2 rounded-[8px] border border-border-glass bg-foreground/[0.03] px-3 py-2 text-[12px] text-foreground/85">
              <LinkIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="truncate">{entry.animeTitle}</span>
            </div>
          </div>
        )}

        {/* Mood picker */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('editor.mood')}
          </span>
          <MoodPickerPills value={mood} onChange={setMood} size="sm" />
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('editor.tags')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span
                key={tag}
                className={cn(
                  'inline-flex items-center gap-1 rounded-[4px] border border-primary/30 bg-primary/15',
                  'px-2 py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-primary'
                )}
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleTagRemove(tag)}
                  aria-label={t('editor.removeTagAriaLabel', { tag })}
                  className="text-primary/70 hover:text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                handleTagAdd();
              }
            }}
            onBlur={handleTagAdd}
            placeholder={t('editor.addTag')}
            aria-label={t('editor.addTagAriaLabel')}
            className={cn(
              'w-full rounded-[6px] border border-dashed border-border-glass bg-transparent',
              'px-2.5 py-1.5 text-[11px] text-foreground',
              'placeholder:text-muted-foreground/60',
              'focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30'
            )}
          />
        </div>
      </aside>

      {/* ── Main editor column ────────────────────────── */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header — mirrors the "POWRÓT DO DZIENNIKA" row from the mock */}
        <header
          className={cn(
            'flex flex-shrink-0 items-start gap-4 border-b border-border-glass',
            'px-7 py-4'
          )}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t('editor.back')}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-[8px] border border-border-glass',
              'bg-foreground/[0.03] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em]',
              'text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground'
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('editor.back')}</span>
            <span className="md:hidden">{t('editor.backShort')}</span>
          </button>

          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {isEditing ? (
                <>
                  <span className="text-primary">{t('editor.editingBadge')}</span>
                  {entry?.createdAt && (
                    <span>
                      ·{' '}
                      {new Date(entry.createdAt).toLocaleDateString(i18n.language, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-primary">{t('editor.newBadge')}</span>
              )}
            </div>
            <input
              id="diary-editor-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('editor.titlePlaceholder')}
              aria-label={t('editor.titleAriaLabel')}
              autoFocus
              className={cn(
                'w-full bg-transparent font-serif text-[22px] font-extrabold leading-tight tracking-[-0.02em]',
                'text-foreground placeholder:text-muted-foreground/40 focus:outline-none'
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 gap-1.5 text-xs">
              {t('editor.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isOverLimit}
              className="h-8 gap-1.5 text-xs"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving
                ? t('state.saving', { ns: 'common' })
                : isEditing
                  ? t('editor.save')
                  : t('editor.create')}
            </Button>
          </div>
        </header>

        {/* Toolbar (Tiptap) */}
        <EditorToolbar
          editor={editor}
          rightSlot={
            <div className="flex items-center gap-2 pl-2">
              <Smile className="w-3.5 h-3.5 text-muted-foreground/80" aria-hidden="true" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-muted-foreground">
                {t('editor.moodLabel')}
              </span>
              <MoodPickerPills value={mood} onChange={setMood} size="xs" />
            </div>
          }
        />

        {/* Editor body */}
        <div className="relative flex-1 overflow-y-auto">
          {editor && (
            <BubbleMenu editor={editor}>
              <BubbleMenuBar editor={editor} />
            </BubbleMenu>
          )}
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
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
                  ? 'text-[oklch(0.8_0.14_70)]'
                  : 'text-muted-foreground'
            )}
            aria-live="polite"
          >
            {t('editor.footerCount', {
              count: textLength,
              max: MAX_CONTENT_LENGTH,
            })}
          </span>
        </footer>
      </section>
    </div>
  );
}
