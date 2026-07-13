import { Badge } from '@/components/ui/badge';
import { useCountdownBadge } from './CountdownBadge.hooks';
import type { ICountdownBadgeProps } from './CountdownBadge.types';

export default function CountdownBadge({ airingAt, episode }: ICountdownBadgeProps) {
  const { label } = useCountdownBadge({ airingAt, episode });

  if (label === null) return null;

  return (
    <Badge className="text-2xs tabular-nums bg-primary/80 text-primary-foreground border-0">
      {label}
    </Badge>
  );
}
