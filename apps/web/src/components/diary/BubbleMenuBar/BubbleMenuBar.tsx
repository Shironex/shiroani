import { cn } from '@/lib/utils';
import { useBubbleMenuBar } from './BubbleMenuBar.hooks';
import { BubbleButton, FormattingButtons } from './BubbleMenuBar.parts';
import type { IBubbleMenuBarProps } from './BubbleMenuBar.types';

/**
 * Tiptap bubble menu surface — floats next to selected text. Restyled to
 * match the redesign's panel vocabulary: card background, soft 1-px border,
 * mono-spaced icon cluster with accent highlight for active marks.
 */
export default function BubbleMenuBar({ editor }: IBubbleMenuBarProps) {
  const { formattingButtons, headingButton } = useBubbleMenuBar(editor);
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-[10px] border border-border-glass bg-popover/95',
        'p-1 shadow-[0_10px_28px_oklch(0_0_0/0.35)] backdrop-blur-sm'
      )}
    >
      <FormattingButtons buttons={formattingButtons} />
      <div aria-hidden="true" className="mx-0.5 h-[18px] w-px bg-border-glass" />
      <BubbleButton button={headingButton} />
    </div>
  );
}
