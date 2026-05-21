import { useMemo, type AriaRole, type KeyboardEvent } from 'react';

export interface ActivatableProps {
  role: AriaRole | undefined;
  tabIndex: number | undefined;
  onClick: (() => void) | undefined;
  onKeyDown: ((e: KeyboardEvent) => void) | undefined;
}

/**
 * Wire a non-button element to behave like one for keyboard/pointer activation.
 *
 * When `onActivate` is provided the returned props expose `role="button"`,
 * `tabIndex={0}`, a click handler, and a keydown handler that fires on Enter or
 * Space (with `preventDefault` to suppress Space-scroll). When it is omitted the
 * element falls back to `inactiveRole` (default `undefined`) and carries no
 * interaction wiring — matching the hand-rolled pattern the schedule cards used.
 */
export function useActivatable(
  onActivate: (() => void) | undefined,
  options?: { inactiveRole?: AriaRole }
): ActivatableProps {
  const inactiveRole = options?.inactiveRole;
  return useMemo(
    () => ({
      role: onActivate ? 'button' : inactiveRole,
      tabIndex: onActivate ? 0 : undefined,
      onClick: onActivate ? () => onActivate() : undefined,
      onKeyDown: onActivate
        ? (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onActivate();
            }
          }
        : undefined,
    }),
    [onActivate, inactiveRole]
  );
}
