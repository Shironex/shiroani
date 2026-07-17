import { Badge } from '@/components/ui/badge';
import { useCountdownBadge } from './CountdownBadge.hooks';
import type { ICountdownBadgeProps } from './CountdownBadge.types';

export default function CountdownBadge({ airingAt, episode }: ICountdownBadgeProps) {
  const { label } = useCountdownBadge({ airingAt, episode });

  if (label === null) return null;

  return (
    <Badge className="text-2xs tabular-nums rounded-[4px] bg-primary text-primary-foreground shadow-[0_1px_4px_oklch(0_0_0/0.5)] border-0">
      {label}
    </Badge>
  );
}
