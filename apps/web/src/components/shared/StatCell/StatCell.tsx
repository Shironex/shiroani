import { cn } from '@/lib/utils';
import { useStatCell } from './StatCell.hooks';
import { StatLabel } from './StatCell.parts';
import type { IStatCellProps } from './StatCell.types';

export default function StatCell({
  label,
  value,
  sub,
  serif,
  className,
  ...props
}: IStatCellProps) {
  useStatCell();

  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      <StatLabel>{label}</StatLabel>
      <span
        className={cn(
          'leading-none text-foreground',
          serif ? 'font-serif text-[28px] font-bold' : 'text-[24px] font-extrabold tracking-tight'
        )}
      >
        {value}
      </span>
      {sub ? <span className="text-[11px] text-muted-foreground">{sub}</span> : null}
    </div>
  );
}
