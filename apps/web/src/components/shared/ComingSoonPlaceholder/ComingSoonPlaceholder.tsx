import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComingSoonPlaceholder } from './ComingSoonPlaceholder.hooks';
import type { IComingSoonPlaceholderProps } from './ComingSoonPlaceholder.types';

export default function ComingSoonPlaceholder({
  icon: Icon = Sparkles,
  title,
  description,
  tag,
  className,
  ...props
}: IComingSoonPlaceholderProps) {
  const { finalTag } = useComingSoonPlaceholder({ tag });

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
