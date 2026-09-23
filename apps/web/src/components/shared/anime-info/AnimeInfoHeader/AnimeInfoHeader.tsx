import { SubscribeBellButton } from '../../SubscribeBellButton';
import type { IAnimeInfoHeaderProps } from './AnimeInfoHeader.types';

export default function AnimeInfoHeader({
  anime,
  title,
  details,
  coverUrl,
  bannerUrl,
  accentColor,
}: IAnimeInfoHeaderProps) {
  const showEnglishTitle = Boolean(details?.title?.english && details.title.english !== title);
  return (
    <div className="relative h-44 overflow-hidden rounded-t-lg shrink-0">
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
      ) : coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="w-full h-full object-cover blur-md scale-110 opacity-50"
        />
      ) : (
        <div className="w-full h-full" style={{ backgroundColor: accentColor ?? 'var(--muted)' }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

      {/* Cover + Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-4">
        {coverUrl && (
          <img
            src={coverUrl}
            alt={title}
            className="w-20 h-28 rounded-lg object-cover shadow-xl border border-border/50 shrink-0"
          />
        )}
        <div className="min-w-0 flex-1 pb-1">
          <h2 className="text-lg font-bold leading-tight text-foreground drop-shadow-sm line-clamp-2">
            {title}
          </h2>
          {showEnglishTitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {details?.title?.english}
            </p>
          )}
          {details?.title?.native && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
              {details.title.native}
            </p>
          )}
        </div>

        {/* Bell button — plain button without tooltip to avoid auto-show on dialog open */}
        <SubscribeBellButton
          anime={anime}
          alwaysVisible
          noTooltip
          className="shrink-0 w-8 h-8 bg-background/60 backdrop-blur-sm"
        />
      </div>
    </div>
  );
}
