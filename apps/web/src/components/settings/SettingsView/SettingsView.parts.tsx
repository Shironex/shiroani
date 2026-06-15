import type { i18n as I18nInstance } from 'i18next';
import { cn } from '@/lib/utils';
import { tDynamic } from '@/lib/i18n';
import type { ISectionDef, SettingsSection } from './SettingsView.types';

interface SidebarGroupProps {
  i18n: I18nInstance;
  groupLabelKey: string;
  items: ISectionDef[];
  activeSection: SettingsSection;
  onSelect: (id: SettingsSection) => void;
}

/** One labeled group of nav tabs in the settings sidebar. */
export function SidebarGroup({
  i18n,
  groupLabelKey,
  items,
  activeSection,
  onSelect,
}: SidebarGroupProps) {
  return (
    <div className="mb-1.5">
      <div className="px-2.5 pt-2 pb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
        {tDynamic(i18n, `settings:nav.${groupLabelKey}`)}
      </div>
      {items.map(section => {
        const Icon = section.Icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(section.id)}
            className={cn(
              'relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg',
              'text-[12.5px] font-medium text-left',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground/90'
            )}
          >
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
              />
            )}
            <Icon
              className={cn('w-[15px] h-[15px] shrink-0', isActive ? 'opacity-100' : 'opacity-85')}
            />
            <span className="truncate">{tDynamic(i18n, `settings:nav.${section.labelKey}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
