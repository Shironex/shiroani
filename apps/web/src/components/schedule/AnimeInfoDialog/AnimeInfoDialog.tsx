import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AnimeInfoHeader } from '../anime-info/AnimeInfoHeader';
import { AnimeInfoStats } from '../anime-info/AnimeInfoStats';
import { AnimeInfoMeta } from '../anime-info/AnimeInfoMeta';
import { AnimeInfoPeople } from '../anime-info/AnimeInfoPeople';
import { AnimeInfoRecommendations } from '../anime-info/AnimeInfoRecommendations';
import { AnimeInfoLinks } from '../anime-info/AnimeInfoLinks';
import { useAnimeInfoDialog } from './AnimeInfoDialog.hooks';
import type { IAnimeInfoDialogProps } from './AnimeInfoDialog.types';

export default function AnimeInfoDialog({ anime, open, onOpenChange }: IAnimeInfoDialogProps) {
  const view = useAnimeInfoDialog(anime, open, onOpenChange);

  if (!view.anime) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{view.title}</DialogTitle>

        <AnimeInfoHeader
          anime={view.anime}
          title={view.title}
          details={view.details}
          coverUrl={view.coverUrl}
          bannerUrl={view.bannerUrl}
          accentColor={view.accentColor}
        />

        {/* Content */}
        <div className="px-5 pb-5 space-y-4">
          <AnimeInfoStats
            anime={view.anime}
            details={view.details}
            topRanking={view.topRanking}
            format={view.format}
            status={view.status}
            episodes={view.episodes}
          />

          <AnimeInfoMeta
            details={view.details}
            mainStudios={view.mainStudios}
            genres={view.genres}
            nonSpoilerTags={view.nonSpoilerTags}
            cleanDescription={view.cleanDescription}
            loading={view.loading}
            descExpanded={view.descExpanded}
            onToggleDesc={() => view.setDescExpanded(v => !v)}
            language={view.language}
          />

          <AnimeInfoPeople details={view.details} />

          <AnimeInfoRecommendations details={view.details} />

          <AnimeInfoLinks
            details={view.details}
            streamingLinks={view.streamingLinks}
            onNavigate={view.handleNavigate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
