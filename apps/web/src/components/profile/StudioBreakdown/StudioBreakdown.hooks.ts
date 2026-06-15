import type { IStudioBreakdownProps, IStudioBreakdownView } from './StudioBreakdown.types';

export function useStudioBreakdown({
  studios,
  limit = 4,
}: IStudioBreakdownProps): IStudioBreakdownView {
  const top = studios.slice(0, limit);
  return { top };
}
