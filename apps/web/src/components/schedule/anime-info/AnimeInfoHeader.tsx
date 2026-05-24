import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnimeDetail } from '@shiroani/shared';

interface AnimeInfoHeaderProps {
  title: string;
  details: AnimeDetail | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
  isSubscribed: boolean;
  onToggleSubscribe: (e: MouseEvent) => void;
}

export function AnimeInfoHeader({
  title,
  details,
  coverUrl,
  bannerUrl,
  accentColor,
  isSubscribed,
  onToggleSubscribe,
}: AnimeInfoHeaderProps) {
  const { t } = useTranslation('schedule');
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
        <div
          className="w-full h-full"
          style={{ backgroundColor: accentColor ?? 'hsl(var(--muted))' }}
        />
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
          {details?.title?.english && details.title.english !== title && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{details.title.english}</p>
          )}
          {details?.title?.native && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
              {details.title.native}
            </p>
          )}
        </div>

        {/* Bell button — plain button without tooltip to avoid auto-show on dialog open */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 w-8 h-8 bg-background/60 backdrop-blur-sm"
          onClick={onToggleSubscribe}
          aria-pressed={isSubscribed}
          aria-label={isSubscribed ? t('subscribe.disable') : t('subscribe.enable')}
        >
          {isSubscribed ? (
            <BellRing className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Bell className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
