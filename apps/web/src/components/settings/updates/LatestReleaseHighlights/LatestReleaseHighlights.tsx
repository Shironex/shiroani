import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { PillTag } from '@/components/ui/pill-tag';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { useLatestReleaseHighlights } from './LatestReleaseHighlights.hooks';

/**
 * Historia zmian preview — pill-tagged summary of the latest release. Short
 * (4 lines max) per mock L1006; the full timeline lives in the dedicated
 * Changelog view.
 */
export default function LatestReleaseHighlights() {
  const { t } = useTranslation('settings');
  const { latest, rows } = useLatestReleaseHighlights();
  if (!latest) return null;

  const rowItems = rows.map((row, i) => (
    <li key={i} className="contents">
      <PillTag
        variant={row.variant}
        className="w-full justify-center mt-[3px] text-[8.5px]! px-1.5! py-[2px]!"
      >
        {row.label}
      </PillTag>
      <span>{row.entry}</span>
    </li>
  ));

  return (
    <SettingsCard
      icon={Sparkles}
      tone="gold"
      title={t('updates.changelogPreview.title')}
      subtitle={t('updates.changelogPreview.subtitle')}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary mb-2">
        v{latest.version} — {latest.date}
      </div>
      <ul className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 items-start text-[12.5px] leading-snug text-foreground/90">
        {rowItems}
      </ul>
    </SettingsCard>
  );
}
