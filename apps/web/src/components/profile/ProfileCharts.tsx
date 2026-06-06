import { memo, useState, useMemo } from 'react';
import { Film, UserRound } from 'lucide-react';
import type {
  UserProfile,
  UserProfileFavouritePerson,
  UserProfileFavouriteStudio,
} from '@shiroani/shared';

export type AccentColor = 'primary' | 'info' | 'warning' | 'success';

const ACCENT_ICON_CLASS: Record<AccentColor, string> = {
  primary: 'text-primary/60',
  info: 'text-status-info/60',
  warning: 'text-status-warning/60',
  success: 'text-status-success/60',
};

export function MetricCard({
  icon,
  value,
  label,
  accent = 'primary',
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent?: AccentColor;
}) {
  return (
    <div className="relative p-3 rounded-xl bg-background/30 overflow-hidden group">
      <div className="flex items-center gap-2">
        <span className={ACCENT_ICON_CLASS[accent]}>{icon}</span>
        <div className="text-lg font-bold text-foreground tabular-nums leading-none">{value}</div>
      </div>
      <div className="text-2xs text-muted-foreground/60 mt-1.5">{label}</div>
    </div>
  );
}

const BAR_BG_CLASS: Record<AccentColor, string> = {
  primary: 'bg-primary/25',
  info: 'bg-status-info/25',
  warning: 'bg-status-warning/25',
  success: 'bg-status-success/25',
};

export function BarRow({
  label,
  value,
  max,
  suffix,
  color = 'primary',
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color?: AccentColor;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs text-foreground/70 w-24 truncate shrink-0 text-right">{label}</span>
      <div className="flex-1 h-5 rounded bg-muted/15 relative overflow-hidden">
        <div
          className={`h-full rounded ${BAR_BG_CLASS[color]} transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-y-0 left-2 flex items-center text-2xs font-semibold text-foreground/60">
          {value}
        </span>
      </div>
      {suffix && <span className="text-2xs text-muted-foreground/40 w-14 shrink-0">{suffix}</span>}
    </div>
  );
}

function scoreBarColor(score: number): string {
  const idx = score / 10;
  if (idx <= 3) return 'var(--destructive)';
  if (idx <= 6) return 'var(--status-warning)';
  if (idx <= 8) return 'var(--primary)';
  return 'var(--status-success)';
}

export function ScoreChart({
  scores,
  maxCount,
}: {
  scores: UserProfile['statistics']['scores'];
  maxCount: number;
}) {
  // Fill in missing scores 10-100
  const filled = useMemo(() => {
    const map = new Map(scores.map(s => [s.score, s.count]));
    return Array.from({ length: 10 }, (_, i) => {
      const score = (i + 1) * 10;
      return { score, count: map.get(score) ?? 0 };
    });
  }, [scores]);

  return (
    <div className="flex items-end gap-1 h-28">
      {filled.map(s => {
        const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
        return (
          <div key={s.score} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative flex-1 flex items-end justify-center">
              {s.count > 0 && (
                <span className="absolute bottom-full mb-0.5 text-[9px] font-semibold text-foreground/50 tabular-nums">
                  {s.count}
                </span>
              )}
              <div
                className="w-full rounded-t transition-[height,background-color] duration-700 ease-out"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  backgroundColor: scoreBarColor(s.score),
                  opacity: 0.35,
                }}
                title={`Ocena ${s.score / 10}: ${s.count} anime`}
              />
            </div>
            <span className="text-[9px] text-muted-foreground/50 tabular-nums leading-none">
              {s.score / 10}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const FavouriteCard = memo(function FavouriteCard({
  fav,
}: {
  fav: UserProfile['favourites'][number];
}) {
  const [imgError, setImgError] = useState(false);
  const title = fav.title.english || fav.title.romaji || fav.title.native || '?';

  return (
    <div className="w-[90px] shrink-0">
      <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border/20 relative">
        {fav.coverImage && !imgError ? (
          <img
            src={fav.coverImage}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <Film className="w-4 h-4 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
          <p className="text-[10px] font-medium text-white leading-tight line-clamp-2">{title}</p>
        </div>
      </div>
    </div>
  );
});

/**
 * Portrait card for a favourited character or staff member. Same poster
 * footprint as {@link FavouriteCard} but keyed on `name`/`image`. No
 * hover-scale / blur / will-change — these cards live in horizontal scroll rows.
 */
export const FavouritePersonCard = memo(function FavouritePersonCard({
  person,
}: {
  person: UserProfileFavouritePerson;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="w-[90px] shrink-0">
      <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border/20 relative">
        {person.image && !imgError ? (
          <img
            src={person.image}
            alt={person.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <UserRound className="w-4 h-4 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
          <p className="text-[10px] font-medium text-white leading-tight line-clamp-2">
            {person.name}
          </p>
        </div>
      </div>
    </div>
  );
});

/**
 * Pill for a favourited studio. Studios have no image on AniList, so they
 * render as a labelled chip rather than a poster card.
 */
export function FavouriteStudioPill({ studio }: { studio: UserProfileFavouriteStudio }) {
  return (
    <span className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg bg-foreground/5 border border-border-glass text-[12px] font-medium text-foreground/90">
      {studio.name}
    </span>
  );
}
