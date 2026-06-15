import { useProfileExtraStats } from './ProfileExtraStats.hooks';
import { ExtraStatsGrid } from './ProfileExtraStats.parts';
import type { IProfileExtraStatsProps } from './ProfileExtraStats.types';

/**
 * Richer statistics blocks surfaced when AniList exposes them — voice actors,
 * staff, start-year timeline and episode-length distribution. All four arrays
 * are OPTIONAL on `UserProfile['statistics']`; each block renders only when its
 * array is present and non-empty (the viewer/private path populates more of
 * them than the public username path).
 *
 * AniList provides no images for these statistics aggregates (only a name/value
 * + count), so they render as ordered count bars mirroring
 * {@link GenreBreakdown} — not avatar rows. Avatars only exist on favourited
 * people, which live in {@link ProfileFavourites}.
 */
export default function ProfileExtraStats({ stats, renderHead }: IProfileExtraStatsProps) {
  const { voiceActors, staff, startYears, lengths, hasAny } = useProfileExtraStats({ stats });

  if (!hasAny) return null;

  return (
    <ExtraStatsGrid
      voiceActors={voiceActors}
      staff={staff}
      startYears={startYears}
      lengths={lengths}
      hasAny={hasAny}
      renderHead={renderHead}
    />
  );
}
