import { EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { ArrowLeft, Check, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditorToolbar } from '../EditorToolbar';
import { BubbleMenuBar } from '../BubbleMenuBar';
import { MoodPickerPills } from '../MoodPickerPills';
import { useDiaryEditor } from './DiaryEditor.hooks';
import { EditorFooter, EditorRail } from './DiaryEditor.parts';
import type { IDiaryEditorProps } from './DiaryEditor.types';

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
export default function DiaryEditor(props: IDiaryEditorProps) {
  const { entry, onClose } = props;
  const {
    t,
    i18n,
    editor,
    isEditing,
    title,
    setTitle,
    coverGradient,
    setCoverGradient,
    mood,
    setMood,
    isPinned,
    togglePinned,
    tagInput,
    setTagInput,
    tags,
    isSaving,
    textLength,
    isOverLimit,
    isNearLimit,
    maxContentLength,
    gradientCss,
    handleSave,
    handleTagAdd,
    handleTagRemove,
  } = useDiaryEditor(props);

  return (
    <div
      role="region"
      aria-label={isEditing ? t('editor.regionEdit') : t('editor.regionNew')}
      className="flex h-full w-full overflow-hidden animate-fade-in"
    >
      {/* ── Left rail ────────────────────────────────── */}
      <EditorRail
        entry={entry}
        gradientCss={gradientCss}
        coverGradient={coverGradient}
        onCoverGradientChange={setCoverGradient}
        isPinned={isPinned}
        onTogglePinned={togglePinned}
        mood={mood}
        onMoodChange={setMood}
        tags={tags}
        tagInput={tagInput}
        onTagInputChange={setTagInput}
        onTagAdd={handleTagAdd}
        onTagRemove={handleTagRemove}
      />

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
        <EditorFooter
          isPinned={isPinned}
          isOverLimit={isOverLimit}
          isNearLimit={isNearLimit}
          textLength={textLength}
          maxContentLength={maxContentLength}
        />
      </section>
    </div>
  );
}
