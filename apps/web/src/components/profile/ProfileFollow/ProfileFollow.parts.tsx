import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  UserMinus,
  UserRound,
  ChevronDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { AniListUser } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FadeInImage } from '@/components/shared/FadeInImage';

const SKELETON_ROWS = [0, 1, 2];

/** Mirrors the backend's `Page(perPage: 50)` — a full page means "50+ loaded". */
const PAGE_LIMIT = 50;

export function FollowError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('profile');
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl px-5 py-6 text-center',
        'border border-destructive/25 bg-destructive/[0.06]'
      )}
    >
      <p className="text-xs text-muted-foreground leading-snug break-words max-w-[44ch]">
        {t('social.error')}
      </p>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={onRetry}>
        <RefreshCw className="w-3.5 h-3.5" />
        {t('social.retry')}
      </Button>
    </div>
  );
}

interface FollowGroupProps {
  label: string;
  users: AniListUser[];
  isLoading: boolean;
  pendingIds: Set<number>;
  onToggle: (userId: number) => void;
  emptyLabel: string;
}

/**
 * One collapsible list (Following or Followers). Header shows the loaded count
 * and toggles the body; the body lists user rows, a skeleton while loading, or
 * an empty hint.
 */
export function FollowGroup({
  label,
  users,
  isLoading,
  pendingIds,
  onToggle,
  emptyLabel,
}: FollowGroupProps) {
  const { t } = useTranslation('profile');
  const [open, setOpen] = useState(false);
  const count = users.length;
  // The backend pages at 50, so a full page is "50+ loaded", not a true total.
  const countLabel =
    count >= PAGE_LIMIT ? t('social.countCapped', { count }) : t('social.count', { count });

  return (
    <div className="rounded-xl border border-border-glass bg-foreground/3 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        disabled={isLoading || count === 0}
        className={cn(
          'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:scale-[0.98]',
          'hover:bg-foreground/5 disabled:cursor-default disabled:hover:bg-transparent'
        )}
      >
        <span className="grid place-items-center w-[18px] h-[18px] shrink-0 rounded-md bg-primary/15 text-primary">
          <Users className="w-3 h-3" aria-hidden="true" />
        </span>
        <span className="text-xs font-medium text-foreground/90 flex-1 min-w-0 truncate">
          {label}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground shrink-0">
          {isLoading ? '—' : countLabel}
        </span>
        {!isLoading && count > 0 && (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'w-3.5 h-3.5 shrink-0 text-muted-foreground/70 transition-transform',
              open && 'rotate-180'
            )}
          />
        )}
      </button>

      {isLoading ? (
        <div className="px-2 pb-2 flex flex-col gap-1.5" aria-busy="true">
          {SKELETON_ROWS.map(i => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : count === 0 ? (
        <p className="px-3.5 pb-3 text-[11.5px] text-muted-foreground/70 leading-snug">
          {emptyLabel}
        </p>
      ) : open ? (
        <ul className="px-2 pb-2 flex flex-col gap-1">
          {users.map(user => (
            <UserRow
              key={user.id}
              user={user}
              pending={pendingIds.has(user.id)}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface UserRowProps {
  user: AniListUser;
  pending: boolean;
  onToggle: (userId: number) => void;
}

/**
 * One user in a follow list — avatar, handle (links to the AniList profile when
 * `siteUrl` is present), and a follow/unfollow toggle. Memoized + fully
 * prop-driven; the row calls the stable `onToggle(user.id)` so the parent's
 * `.map` never has to create a fresh closure per row.
 */
const UserRow = memo(function UserRow({ user, pending, onToggle }: UserRowProps) {
  const { t } = useTranslation('profile');
  const isFollowing = user.isFollowing === true;

  return (
    <li className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-foreground/4">
      <Avatar src={user.avatar} name={user.name} />
      {user.siteUrl ? (
        <a
          href={user.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-foreground/90 flex-1 min-w-0 truncate hover:text-primary hover:underline"
        >
          {user.name}
        </a>
      ) : (
        <span className="text-xs font-medium text-foreground/90 flex-1 min-w-0 truncate">
          {user.name}
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggle(user.id)}
        disabled={pending}
        aria-label={
          isFollowing
            ? t('follow.unfollowAria', { name: user.name })
            : t('follow.followAria', { name: user.name })
        }
        className={cn(
          'h-7 px-2.5 text-[11px] font-medium gap-1.5 shrink-0',
          isFollowing
            ? 'bg-foreground/5 border border-foreground/10 text-muted-foreground hover:bg-destructive/15 hover:text-destructive hover:border-destructive/30'
            : 'bg-primary/15 border border-primary/30 text-primary hover:bg-primary/20 hover:text-primary'
        )}
      >
        {pending ? (
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
        ) : isFollowing ? (
          <UserMinus className="w-3 h-3" aria-hidden="true" />
        ) : (
          <UserPlus className="w-3 h-3" aria-hidden="true" />
        )}
        {isFollowing ? t('follow.following') : t('follow.follow')}
      </Button>
    </li>
  );
});

/**
 * 28×28 round avatar with a placeholder fallback. Local error state, lazy, no
 * hover-scale / backdrop-blur / will-change — these rows scroll.
 */
function Avatar({ src, name }: { src?: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  return (
    <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden border border-border/20 bg-muted/30">
      {showImage ? (
        <FadeInImage
          src={src}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full grid place-items-center">
          {name.charAt(0).toUpperCase() || (
            <UserRound className="w-3.5 h-3.5 text-muted-foreground/30" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg">
      <div className="w-7 h-7 shrink-0 rounded-full bg-foreground/5 animate-pulse" />
      <div className="h-3 w-1/3 rounded bg-foreground/5 animate-pulse" />
      <div className="ml-auto h-6 w-16 rounded bg-foreground/5 animate-pulse" />
    </div>
  );
}
