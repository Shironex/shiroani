import { cn } from '@/lib/utils';
import type { AccentType } from './LibraryStats.types';

const ACCENT_STYLES: Record<AccentType, { iconBg: string; iconColor: string; glowVar: string }> = {
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    glowVar: 'var(--primary)',
  },
  info: {
    iconBg: 'bg-status-info/10',
    iconColor: 'text-status-info',
    glowVar: 'var(--status-info)',
  },
  success: {
    iconBg: 'bg-status-success/10',
    iconColor: 'text-status-success',
    glowVar: 'var(--status-success)',
  },
  warning: {
    iconBg: 'bg-status-warning/10',
    iconColor: 'text-status-warning',
    glowVar: 'var(--status-warning)',
  },
};

export function StatCard({
  icon,
  label,
  value,
  subtitle,
  accent = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: AccentType;
}) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 p-3 rounded-xl overflow-hidden',
        'bg-background/40 border border-border-glass',
        'backdrop-blur-sm',
        'transition-all duration-200',
        'hover:bg-background/60 hover:border-border-glass/80',
        'group'
      )}
    >
      {/* Subtle accent glow behind */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-[0.07] blur-xl transition-opacity duration-300 group-hover:opacity-[0.12]"
        style={{
          background: `radial-gradient(circle, ${styles.glowVar} 0%, transparent 70%)`,
        }}
      />

      {/* Icon */}
      <div
        className={cn(
          'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
          'transition-transform duration-200 group-hover:scale-105',
          styles.iconBg,
          styles.iconColor
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground leading-none tabular-nums tracking-tight">
            {value}
          </span>
        </div>
        <span className="text-2xs text-muted-foreground leading-tight block mt-0.5">{label}</span>
        {subtitle && (
          <span className="text-2xs text-muted-foreground/50 leading-tight block">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
