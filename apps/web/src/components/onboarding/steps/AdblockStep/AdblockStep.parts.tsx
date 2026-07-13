import { Check, Plus } from 'lucide-react';

/**
 * A single row in the "what gets blocked" list — a check glyph for things that
 * are blocked, a plus glyph for the exceptions/allowlist row.
 */
export function BlockedRow({
  label,
  variant = 'check',
}: {
  label: string;
  variant?: 'check' | 'add';
}) {
  return (
    <li className="flex items-center justify-between border-b border-border-glass/60 py-1.5 text-muted-foreground last:border-b-0">
      <span>{label}</span>
      <span className="font-bold text-primary">
        {variant === 'check' ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </span>
    </li>
  );
}
