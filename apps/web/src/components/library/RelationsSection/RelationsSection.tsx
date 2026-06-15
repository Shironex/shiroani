import { useTranslation } from 'react-i18next';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PillTag } from '@/components/ui/pill-tag';
import { tDynamic } from '@/lib/i18n';
import { useRelationsSection } from './RelationsSection.hooks';
import { FieldLabel } from './RelationsSection.parts';
import type { IRelationsSectionProps } from './RelationsSection.types';

/**
 * "Powiązane" section in the library detail modal. Relations are already part of
 * the cached {@link AnimeDetail} (the AniList details query fetches them), so this
 * only ensures the detail is loaded and renders the relation nodes. A relation
 * node is an AniList media id — clicking it opens that entry's detail only when
 * the title exists in the user's library (the modal renders library entries);
 * relations not in the library are shown muted and non-interactive.
 */
export default function RelationsSection(props: IRelationsSectionProps) {
  const { t, i18n } = useTranslation('library');
  const { detail, isLoading, failed, relations, entryByAnilistId, openLibraryEntry } =
    useRelationsSection(props);

  // Loading skeleton while the detail (with relations) is still being fetched.
  if (isLoading && !detail) {
    return (
      <div className="space-y-2">
        <FieldLabel>{t('relations.title')}</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      </div>
    );
  }

  // Nothing to show: failed fetch or genuinely no relations — render empty hint
  // only when we have a resolved (or failed) detail, so the section is graceful.
  if (relations.length === 0) {
    if (!detail && !failed) return null;
    return (
      <div className="space-y-1.5">
        <FieldLabel>{t('relations.title')}</FieldLabel>
        <p className="text-2xs text-muted-foreground/70">{t('relations.empty')}</p>
      </div>
    );
  }

  const relationCards = relations.map(rel => {
    const node = rel.node;
    const libraryEntry = entryByAnilistId.get(node.id);
    const title = node.title.romaji || node.title.english || `#${node.id}`;
    const cover = node.coverImage?.medium;
    const relationLabel = tDynamic(i18n, `library:relations.type.${rel.relationType}`, {
      defaultValue: tDynamic(i18n, 'library:relations.type.OTHER'),
    });
    const clickable = !!libraryEntry;

    return (
      <button
        key={`${rel.relationType}-${node.id}`}
        type="button"
        disabled={!clickable}
        onClick={() => {
          if (libraryEntry) openLibraryEntry(libraryEntry);
        }}
        aria-label={clickable ? t('relations.openInLibrary') : t('relations.notInLibrary')}
        className={cn(
          'flex items-center gap-2.5 p-1.5 rounded-md border text-left',
          'border-border-glass bg-background/40 transition-colors',
          clickable
            ? 'hover:bg-foreground/5 hover:border-primary/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            : 'opacity-55 cursor-default'
        )}
      >
        {cover ? (
          <img
            src={cover}
            alt={title}
            className="w-9 h-12 rounded object-cover shrink-0 border border-border-glass"
            loading="lazy"
          />
        ) : (
          <div className="w-9 h-12 rounded bg-muted/50 shrink-0 border border-border-glass flex items-center justify-center">
            <Film className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <PillTag variant="muted" className="mb-1 max-w-full truncate">
            {relationLabel}
          </PillTag>
          <p className="text-[12px] font-semibold leading-[1.2] line-clamp-2 text-foreground/90">
            {title}
          </p>
        </div>
      </button>
    );
  });

  return (
    <div className="space-y-2">
      <FieldLabel>{t('relations.title')}</FieldLabel>
      <div className="grid grid-cols-2 gap-2">{relationCards}</div>
    </div>
  );
}
