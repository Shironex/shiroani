import type { Bookmark } from 'lucide-react';

interface PanelHeaderProps {
  id: string;
  icon: typeof Bookmark;
  title: string;
  meta?: string;
}

export function PanelHeader({ id, icon: Icon, title, meta }: PanelHeaderProps) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
        <Icon className="w-3 h-3" />
      </span>
      <h2
        id={id}
        className="flex-1 min-w-0 truncate font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
      >
        {title}
      </h2>
      {meta && (
        <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/70">
          {meta}
        </span>
      )}
    </div>
  );
}
