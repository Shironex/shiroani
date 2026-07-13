import { cn } from '@/lib/utils';
import { useEyebrow } from './Eyebrow.hooks';
import type { IEyebrowProps } from './Eyebrow.types';

/**
 * Canonical "eyebrow" / field-label kicker — the small mono, uppercase, wide-
 * tracked caption used above sections and form fields across the app. Tracking
 * is canonicalized on `0.18em`.
 *
 * Pass `htmlFor` to render a `<label>` bound to a form control; omit it for a
 * decorative section kicker (renders a `<span>`).
 */
export default function Eyebrow({ htmlFor, className, ...props }: IEyebrowProps) {
  useEyebrow();

  const classes = cn(
    'font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground',
    className
  );

  if (htmlFor !== undefined) {
    return <label htmlFor={htmlFor} className={classes} {...props} />;
  }
  return <span className={classes} {...props} />;
}
