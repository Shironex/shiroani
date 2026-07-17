import { cn } from '@/lib/utils';
import { Eyebrow } from '@/components/shared/Eyebrow';
import { StatCard } from '../shared-parts';

export { SectionHead } from '../shared-parts';

/** In-app counter card — the medium-sized {@link StatCard} variant. */
export function CounterCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'accent' | 'gold';
}) {
  return <StatCard label={label} value={value} sub={sub} tone={tone} size="md" />;
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'accent' }) {
  return (
    <div className="flex flex-col">
      <Eyebrow>{label}</Eyebrow>
      <span
        className={cn(
          'font-sans font-extrabold text-[18px] tracking-[-0.02em] tabular-nums',
          tone === 'accent' ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}
