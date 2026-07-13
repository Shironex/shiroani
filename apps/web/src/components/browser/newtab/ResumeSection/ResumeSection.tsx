import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { PanelHeader } from '../PanelHeader';
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
      className="relative rounded-[calc(var(--radius)+4px)] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden"
    >
      <PanelHeader
        id="newtab-resume"
        icon={Play}
        title={t('newTab.resume.title')}
        meta={
          watching.length > 0 ? t('newTab.resume.count', { count: watching.length }) : undefined
        }
      />

      {watching.length === 0 ? (
        <EmptyResumeState onBrowseLibrary={navigateToLibrary} />
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">{cards}</div>
      )}
    </section>
  );
}
