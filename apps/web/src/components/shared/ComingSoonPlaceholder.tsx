import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * Reusable placeholder rendered in the new design language for sections of
 * the app that haven't been ported yet. Each redesign phase can drop this in
 * when a sub-surface (e.g. Electron webview chrome, Tiptap editor, activity
 * heatmap) needs more work than the current phase covers.
 */
export interface ComingSoonPlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional short tag shown above the title ("SOON", "BETA", etc.) */
  tag?: string;
}

export function ComingSoonPlaceholder({
  icon: Icon = Sparkles,
  title,
  description,
  tag,
  className,
  ...props
}: ComingSoonPlaceholderProps) {
  const { t } = useTranslation('nav');
  const finalTag = tag ?? t('comingSoon.tag');
  return (
    <div
      className={cn(
        'relative flex min-h-[280px] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-8 text-center',
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 50% at 50% 0%, oklch(from var(--primary) l c h / 0.12), transparent 60%)',
        }}
      />
      <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <div className="relative flex flex-col gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          {finalTag}
        </span>
        <h3 className="font-serif text-xl font-bold tracking-tight text-foreground">{title}</h3>
        {description ? (
          <p className="max-w-[44ch] text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
