/**
 * Shared inline formatters for onboarding `<Trans>` copy.
 *
 * Each is a bare element handed to a `components` slot — react-i18next clones it
 * with the translated children, so a single shared instance is safe to reuse
 * across every step. Extracted here so the ten step files stop re-declaring the
 * same trio (and so the emphasis styling stays in one place).
 *
 * - `emPrimary` — italic primary emphasis (the headline accent word).
 * - `bStrong`   — bold foreground run inside descriptions.
 * - `bPrimary`  — bold primary run inside the step marker.
 */
export const emPrimary = <em className="text-primary italic" />;
export const bStrong = <b className="font-semibold text-foreground" />;
export const bPrimary = <b className="font-bold text-primary" />;
