import { Trans, useTranslation } from 'react-i18next';
import {
  BookMarked,
  Languages,
  Library,
  LayoutGrid,
  MessageCircle,
  Palette,
  PartyPopper,
  Shield,
  Sparkles,
} from 'lucide-react';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bStrong, bPrimary } from '../../shared-parts';
import { useSummaryStep } from './SummaryStep.hooks';
import { SummaryRow } from './SummaryStep.parts';

/**
 * Step 09 · Summary.
 *
 * Read-only confirmation screen — reflects every store the wizard touched. The
 * "Zaczynamy!" CTA lives in the wizard chrome (wired to `onComplete`).
 */
export default function SummaryStep() {
  const { t } = useTranslation('onboarding');
  const {
    languageValue,
    themeLabel,
    backgroundLabel,
    dockLabel,
    discordValue,
    discordHighlight,
    anilistValue,
    anilistHighlight,
    malValue,
    malHighlight,
    adblockValue,
    adblockHighlight,
  } = useSummaryStep();

  return (
    <StepLayout
      kanji="完"
      headline={
        <Trans ns="onboarding" i18nKey="step.summary.headline" components={{ 1: emPrimary }} />
      }
      description={
        <Trans ns="onboarding" i18nKey="step.summary.description" components={{ 1: bStrong }} />
      }
      stepMarker={
        <Trans ns="onboarding" i18nKey="step.summary.marker" components={{ 1: bPrimary }} />
      }
      stepTitle={t('step.summary.title')}
      stepIcon={
        <span
          className="grid h-10 w-10 place-items-center rounded-full border border-primary/35 bg-primary/15 text-primary animate-[splash-bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          aria-hidden="true"
        >
          <PartyPopper className="h-5 w-5" />
        </span>
      }
    >
      <p className="max-w-[34ch] text-xs leading-relaxed text-muted-foreground">
        {t('step.summary.intro')}
      </p>

      <div className="flex flex-col gap-2">
        <SummaryRow
          icon={<Languages className="h-4 w-4" />}
          label={t('step.summary.row.language')}
          value={languageValue}
        />
        <SummaryRow
          icon={<Palette className="h-4 w-4" />}
          label={t('step.summary.row.theme')}
          value={themeLabel}
        />
        <SummaryRow
          icon={<Sparkles className="h-4 w-4" />}
          label={t('step.summary.row.background')}
          value={backgroundLabel}
        />
        <SummaryRow
          icon={<LayoutGrid className="h-4 w-4" />}
          label={t('step.summary.row.dock')}
          value={dockLabel}
        />
        <SummaryRow
          icon={<MessageCircle className="h-4 w-4" />}
          label={t('step.summary.row.discord')}
          value={discordValue}
          highlight={discordHighlight}
        />
        <SummaryRow
          icon={<Library className="h-4 w-4" />}
          label={t('step.summary.row.anilist')}
          value={anilistValue}
          highlight={anilistHighlight}
        />
        <SummaryRow
          icon={<BookMarked className="h-4 w-4" />}
          label={t('step.summary.row.mal')}
          value={malValue}
          highlight={malHighlight}
        />
        <SummaryRow
          icon={<Shield className="h-4 w-4" />}
          label={t('step.summary.row.adblock')}
          value={adblockValue}
          highlight={adblockHighlight}
        />
      </div>
    </StepLayout>
  );
}
