import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * "Experimental" caution chip for features that aren't fully stable yet
 * (currently the AniList / MyAnimeList integrations). Amber-toned so it reads as
 * a heads-up rather than a brand accent, with the longer explanation exposed via
 * the native `title` tooltip. Label + tooltip live in the shared `common`
 * namespace so every surface (onboarding steps, settings cards) stays in sync.
 */
export function ExperimentalBadge({ className, ...props }: Omit<BadgeProps, 'variant'>) {
  const { t } = useTranslation('common');
  return (
    <Badge
      variant="outline"
      title={t('experimental.tooltip')}
      className={cn(
        'border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-400',
        className
      )}
      {...props}
    >
      <FlaskConical className="size-3 flex-shrink-0" aria-hidden="true" />
      {t('experimental.label')}
    </Badge>
  );
}
