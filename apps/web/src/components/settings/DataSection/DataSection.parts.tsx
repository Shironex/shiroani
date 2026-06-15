import type { IExportScopeTileProps } from './DataSection.types';

export function ExportScopeTile({ icon: Icon, label, value }: IExportScopeTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-glass bg-background/30 px-3 py-2.5">
      <span className="grid size-9 flex-shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-foreground">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground">{value}</div>
      </div>
    </div>
  );
}
