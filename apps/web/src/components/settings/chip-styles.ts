/**
 * Shared class strings for the app's "selectable chip" idiom — the segmented
 * pills used across settings (channel picker, font-scale buttons, sync
 * direction radios, system-theme row, language buttons). Extracted so the
 * selected-state alpha and idle treatment stay identical everywhere instead of
 * drifting between `bg-primary/12`, `/15`, `/18` per caller.
 *
 * Callers add their own layout (padding, radius, text size) and, where the
 * design calls for it, a `font-semibold` on the active state.
 */
export const selectableChipActive = 'border-primary/35 bg-primary/15 text-primary';

export const selectableChipIdle =
  'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground';

/** Pick the active or idle chip classes for a boolean selected state. */
export function selectableChip(active: boolean): string {
  return active ? selectableChipActive : selectableChipIdle;
}
