import { useTranslation } from 'react-i18next';
import { getAnilistRelationLabel } from '@/lib/constants';
import { PersonCard } from '../PersonCard';
import type {
  ICharactersListProps,
  IRelationsListProps,
  IStaffListProps,
} from './AnimeInfoPeople.types';

/** Character cards (capped at 6) — avatar + name + role. */
export function CharactersList({ characters }: ICharactersListProps) {
  const { t } = useTranslation('schedule');

  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('dialog.characters')}</h3>
      <div className="grid grid-cols-2 gap-2">
        {characters.slice(0, 6).map(char => (
          <PersonCard
            key={char.node.id}
            imageUrl={char.node.image?.medium}
            name={char.node.name.userPreferred ?? char.node.name.full ?? ''}
            subtitle={char.role?.toLowerCase() ?? ''}
          />
        ))}
      </div>
    </div>
  );
}

/** Staff cards (capped at 4) — avatar + name + role. */
export function StaffList({ staff }: IStaffListProps) {
  const { t } = useTranslation('schedule');

  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('dialog.staff')}</h3>
      <div className="grid grid-cols-2 gap-2">
        {staff.slice(0, 4).map(staffEdge => (
          <PersonCard
            key={`${staffEdge.node.id}-${staffEdge.role}`}
            imageUrl={staffEdge.node.image?.medium}
            name={staffEdge.node.name.userPreferred ?? staffEdge.node.name.full ?? ''}
            subtitle={staffEdge.role}
          />
        ))}
      </div>
    </div>
  );
}

/** Related-anime covers (capped at 8) — horizontal scroll row. */
export function RelationsList({ relations }: IRelationsListProps) {
  const { t } = useTranslation('schedule');

  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('dialog.related')}</h3>
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-proximity [mask-image:linear-gradient(to_right,#000_calc(100%_-_32px),transparent_100%)]">
        {relations.slice(0, 8).map(rel => (
          <div
            key={`${rel.node.id}-${rel.relationType}`}
            className="shrink-0 w-24 snap-start text-center"
          >
            {rel.node.coverImage?.medium ? (
              <img
                src={rel.node.coverImage.medium}
                alt={rel.node.title.romaji ?? rel.node.title.english ?? ''}
                className="w-full aspect-[3/4] rounded-lg object-cover border border-border/50"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[3/4] rounded-lg bg-muted border border-border/50" />
            )}
            <p className="text-2xs text-primary mt-1">
              {getAnilistRelationLabel(rel.relationType)}
            </p>
            <p className="text-2xs font-medium truncate mt-0.5">
              {rel.node.title.romaji ?? rel.node.title.english}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
