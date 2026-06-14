import { useTranslation } from 'react-i18next';
import type { FeedItem, FeedLanguage } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { FeedListItem } from '../FeedListItem';
import type { IFeedFilterOption } from './FeedView.types';

interface ILanguageToggleProps {
  options: IFeedFilterOption<FeedLanguage | 'all'>[];
  active: FeedLanguage | 'all';
  onSelect: (value: FeedLanguage | 'all') => void;
}

/** Language pill toggle in the view header — mirrors the mock sub-header. */
export function LanguageToggle({ options, active, onSelect }: ILanguageToggleProps) {
  const { t } = useTranslation('feed');

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5"
      role="group"
      aria-label={t('language.ariaLabel')}
    >
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          aria-pressed={active === value}
          className={cn(
            'px-2.5 h-6 rounded-md text-[11px] font-medium transition-colors duration-150',
            active === value
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground/80 hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

interface IFeedListProps {
  items: FeedItem[];
  feedView: 'all' | 'bookmarks';
  readIds: Set<number>;
  onOpen: (item: FeedItem) => void;
  onOpenExternal: (item: FeedItem) => void;
}

/** The vertical list of feed rows below the hero card. */
export function FeedList({ items, feedView, readIds, onOpen, onOpenExternal }: IFeedListProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map(item => (
        <FeedListItem
          key={item.id}
          item={item}
          unread={feedView === 'all' && !readIds.has(item.id)}
          onOpen={onOpen}
          onOpenExternal={onOpenExternal}
        />
      ))}
    </div>
  );
}
