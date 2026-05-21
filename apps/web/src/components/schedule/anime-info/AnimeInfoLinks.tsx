import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnimeDetail, AnimeDetailExternalLink } from '@shiroani/shared';

interface AnimeInfoLinksProps {
  details: AnimeDetail | null;
  streamingLinks: AnimeDetailExternalLink[];
  onNavigate: (url: string) => void;
}

export function AnimeInfoLinks({ details, streamingLinks, onNavigate }: AnimeInfoLinksProps) {
  const { t } = useTranslation('schedule');

  return (
    <>
      {/* Trailer */}
      {details?.trailer?.id && details.trailer.site === 'youtube' && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('dialog.trailer')}</h3>
          <div className="relative aspect-video rounded-lg overflow-hidden border border-border/50">
            <iframe
              src={`https://www.youtube.com/embed/${details.trailer.id}`}
              title={t('dialog.trailerTitle')}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Streaming links */}
      {streamingLinks.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">
            {t('dialog.streaming')}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {streamingLinks.map(link => (
              <Button
                key={link.url}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => onNavigate(link.url)}
              >
                {link.icon && <img src={link.icon} alt="" className="w-3.5 h-3.5" />}
                {link.site}
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* AniList link — opens in the in-app browser */}
      {details?.siteUrl && (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 w-full"
            onClick={() => onNavigate(details.siteUrl!)}
          >
            {t('dialog.openOnAniList')}
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      )}
    </>
  );
}
