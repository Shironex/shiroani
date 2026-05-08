import { useTranslation } from 'react-i18next';
import { PillTag } from '@/components/ui/pill-tag';
import type { UserProfile } from '@shiroani/shared';

interface StudioBreakdownProps {
  studios: UserProfile['statistics']['studios'];
  limit?: number;
}

/**
 * Ordered list of the user's most-watched studios. Each row pairs the
 * studio name with a count pill — matches the Profile mock's studio list
 * (the sibling pattern below `.side-label{Ulubione studia}`).
 */
export function StudioBreakdown({ studios, limit = 4 }: StudioBreakdownProps) {
  const { t } = useTranslation('profile');
  const top = studios.slice(0, limit);

  if (top.length === 0) {
    return <p className="text-[12px] text-muted-foreground/70">{t('studios.empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {top.map((s, i) => (
        <div
          key={s.name}
          className="flex justify-between items-center text-[12px] py-1.5 border-b border-border-glass/60 last:border-b-0"
        >
          <span className="text-foreground/90 truncate pr-2">{s.name}</span>
          <PillTag
            variant={i === 0 ? 'accent' : 'muted'}
            className="text-[9px] px-1.5 py-0.5 shrink-0 tabular-nums"
          >
            {s.count}
          </PillTag>
        </div>
      ))}
    </div>
  );
}
