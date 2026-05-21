import { useTranslation } from 'react-i18next';
import { getAnilistRelationLabel } from '@/lib/constants';
import type { AnimeDetail } from '@shiroani/shared';
import { PersonCard } from './PersonCard';

interface AnimeInfoPeopleProps {
  details: AnimeDetail | null;
}

export function AnimeInfoPeople({ details }: AnimeInfoPeopleProps) {
  const { t } = useTranslation('schedule');

  return (
    <>
      {/* Characters */}
      {details?.characters?.edges && details.characters.edges.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            {t('dialog.characters')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {details.characters.edges.slice(0, 6).map(char => (
              <PersonCard
                key={char.node.id}
                imageUrl={char.node.image?.medium}
                name={char.node.name.userPreferred ?? char.node.name.full ?? ''}
                subtitle={char.role?.toLowerCase() ?? ''}
              />
            ))}
          </div>
        </div>
      )}

      {/* Staff */}
      {details?.staff?.edges && details.staff.edges.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('dialog.staff')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {details.staff.edges.slice(0, 4).map(staff => (
              <PersonCard
                key={`${staff.node.id}-${staff.role}`}
                imageUrl={staff.node.image?.medium}
                name={staff.node.name.userPreferred ?? staff.node.name.full ?? ''}
                subtitle={staff.role}
              />
            ))}
          </div>
        </div>
      )}

      {/* Relations */}
      {details?.relations?.edges && details.relations.edges.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('dialog.related')}</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {details.relations.edges.slice(0, 8).map(rel => (
              <div key={`${rel.node.id}-${rel.relationType}`} className="shrink-0 w-24 text-center">
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
      )}
    </>
  );
}
