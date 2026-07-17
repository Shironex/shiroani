import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import type { DiaryMood, DiaryGradient } from '@shiroani/shared';
import { DIARY_GRADIENTS, DEFAULT_DIARY_GRADIENT } from '@/lib/diary-constants';
import { isEditableTarget } from '@/lib/is-editable-target';
import type { IDiaryEditorProps, IDiaryEditorView } from './DiaryEditor.types';

const MAX_CONTENT_LENGTH = 2000;

export function useDiaryEditor({
  entry,
  onClose,
  onCreate,
  onUpdate,
}: IDiaryEditorProps): IDiaryEditorView {
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
          'min-h-full px-10 py-8 caret-primary focus:outline-none',
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

  const togglePinned = useCallback(() => setIsPinned(p => !p), []);

  // Re-read on each render — `useEditor` subscribes and triggers re-renders
  // on editor state changes, so this stays live without extra plumbing.
  const textLength = editor?.getText().length ?? 0;
  const isOverLimit = textLength > MAX_CONTENT_LENGTH;
  // Warn once the user is within the final 10% of the budget so the red
  // "save disabled" state never appears without a prior heads-up.
  const isNearLimit = !isOverLimit && textLength >= MAX_CONTENT_LENGTH * 0.9;

  const gradientCss = coverGradient ? DIARY_GRADIENTS[coverGradient]?.css : DEFAULT_DIARY_GRADIENT;

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

  return {
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
    maxContentLength: MAX_CONTENT_LENGTH,
    gradientCss,
    handleSave,
    handleTagAdd,
    handleTagRemove,
  };
}
