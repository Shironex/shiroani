import { Button } from '@/components/ui/button';
import { useEmptyState } from './EmptyState.hooks';
import type { IEmptyStateProps } from './EmptyState.types';

export default function EmptyState({ icon: Icon, title, subtitle, action }: IEmptyStateProps) {
  useEmptyState();

  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 py-16">
      <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center border border-primary/10">
        <Icon className="w-8 h-8 text-primary/30" aria-hidden="true" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground max-w-[320px]">{subtitle}</p>
      </div>
      {action && (
        <Button
          variant="outline"
          size="sm"
          className="mt-1 gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={action.onClick}
        >
          {action.icon && <action.icon className="w-3.5 h-3.5" aria-hidden="true" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
