import { cn } from '@/lib/utils';
import { useSectionLabel } from './SectionLabel.hooks';
import type { ISectionLabelProps } from './SectionLabel.types';

/**
 * The small muted caption ("Studios", "Genres", "Characters", …) sitting above
 * each block in the anime detail dialog. Canonicalizes the repeated
 * `text-xs font-medium text-muted-foreground` heading; the bottom margin
 * defaults to `mb-1.5` and can be overridden per call site via `className`.
 */
export default function SectionLabel({ className, ...props }: ISectionLabelProps) {
  useSectionLabel();

  return (
    <h3 className={cn('text-xs font-medium text-muted-foreground mb-1.5', className)} {...props} />
  );
}
