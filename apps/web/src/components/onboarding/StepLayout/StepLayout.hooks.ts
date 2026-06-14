import { cn } from '@/lib/utils';
import type { IStepLayoutView } from './StepLayout.types';

const RIGHT_PANE_BASE =
  'relative flex min-w-0 flex-col gap-3.5 overflow-y-auto border-l border-border-glass bg-background/40 px-8 py-10 md:px-10 md:py-11';

export function useStepLayout(rightClassName?: string): IStepLayoutView {
  return { rightPaneClass: cn(RIGHT_PANE_BASE, rightClassName) };
}
