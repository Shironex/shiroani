import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { useResumeSection } from './ResumeSection.hooks';
import { ResumeCard, EmptyResumeState } from './ResumeSection.parts';
import type { IResumeSectionProps } from './ResumeSection.types';

/** Resume watching section — pulls currently-watching entries from library. */
export default function ResumeWatchingSection({ onNavigate }: IResumeSectionProps) {
  const { t } = useTranslation('browser');
  const { watching, navigateToLibrary } = useResumeSection();

  const cards = watching.map(entry => (
    <ResumeCard
      key={entry.id}
      entry={entry}
      onResume={() => {
        if (entry.resumeUrl) onNavigate(entry.resumeUrl);
        else navigateToLibrary();
      }}
    />
  ));

  return (
    <section
      aria-labelledby="newtab-resume"
      className="relative rounded-[14px] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
          <Play className="w-3 h-3" />
        </span>
        <h2
          id="newtab-resume"
          className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          {t('newTab.resume.title')}
        </h2>
        {watching.length > 0 ? (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/70">
            {t('newTab.resume.count', { count: watching.length })}
          </span>
        ) : null}
      </div>

      {watching.length === 0 ? (
        <EmptyResumeState onBrowseLibrary={navigateToLibrary} />
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">{cards}</div>
      )}
    </section>
  );
}
