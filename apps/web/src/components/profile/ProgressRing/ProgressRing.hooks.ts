import type { IProgressRingProps, IProgressRingView } from './ProgressRing.types';

/**
 * Pure geometry for the circular progress ring — clamps the value, derives the
 * dash offset that animates the filled arc, and resolves the centred value
 * label. No React state; computation only, lifted out of the shell body.
 */
export function useProgressRing(
  props: Pick<IProgressRingProps, 'value' | 'size' | 'strokeWidth' | 'valueLabel'>
): IProgressRingView {
  const { value, size = 72, strokeWidth = 6, valueLabel } = props;
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const display = valueLabel !== undefined ? valueLabel : `${Math.round(clamped)}%`;

  return { radius, circumference, offset, display };
}
