import { cn } from '@/lib/utils';
import { useMoodPickerPills } from './MoodPickerPills.hooks';
import { MoodPills } from './MoodPickerPills.parts';
import type { IMoodPickerPillsProps } from './MoodPickerPills.types';

/**
 * Shared mood picker used in the diary editor's left rail (labelled pills)
 * and toolbar (emoji-only tiles). Toggling the active mood clears it.
 */
export default function MoodPickerPills({
  value,
  onChange,
  size,
  className,
}: IMoodPickerPillsProps) {
  const { options } = useMoodPickerPills();
  return (
    <div
      className={cn(
        size === 'sm' ? 'flex flex-wrap gap-1.5' : 'flex items-center gap-1',
        className
      )}
    >
      <MoodPills options={options} value={value} onChange={onChange} size={size} />
    </div>
  );
}
