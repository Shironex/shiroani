import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { Sparkles } from 'lucide-react';
import { tDynamic } from '@/lib/i18n';
import { PillTag } from '@/components/ui/pill-tag';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { getChangelogReleases, CHANGELOG_CATEGORY_VARIANT } from '@/lib/changelog-entries';

/**
 * Historia zmian preview — pill-tagged summary of the latest release. Short
 * (4 lines max) per mock L1006; the full timeline lives in the dedicated
 * Changelog view.
 */
export function LatestReleaseHighlights() {
  const { t, i18n } = useTranslation('settings');
  const latest = getChangelogReleases(i18n.language)[0];
  if (!latest) return null;

  // Flatten the release's categories into (variant, label, entry) triples,
  // cap at 4 rows (mock: 4-line preview; full list lives in Changelog view).
  const MAX_ROWS = 4;
  const rows: Array<{ variant: ReturnType<typeof variantFor>; label: string; entry: string }> = [];
  for (const cat of latest.categories) {
    for (const entry of cat.entries) {
      if (rows.length >= MAX_ROWS) break;
      rows.push({ variant: variantFor(cat.kind), label: shortLabel(cat.label, i18n), entry });
    }
    if (rows.length >= MAX_ROWS) break;
  }

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
        {rows.map((row, i) => (
          <li key={i} className="contents">
            <PillTag
              variant={row.variant}
              className="w-full justify-center mt-[3px] !text-[8.5px] !px-1.5 !py-[2px]"
            >
              {row.label}
            </PillTag>
            <span>{row.entry}</span>
          </li>
        ))}
      </ul>
    </SettingsCard>
  );
}

function variantFor(kind: keyof typeof CHANGELOG_CATEGORY_VARIANT) {
  return CHANGELOG_CATEGORY_VARIANT[kind];
}

/** Shorten category labels so the pill stays compact. */
function shortLabel(label: string, i18n: I18nInstance): string {
  // The original PL labels arrive from `lib/changelog-entries`; map them to
  // localized short tags. Falls back to the raw label for non-PL inputs.
  const keyMap: Record<string, string> = {
    Nowości: 'updates.changelogPreview.shortLabels.new',
    Poprawki: 'updates.changelogPreview.shortLabels.fix',
    Dopracowania: 'updates.changelogPreview.shortLabels.polish',
    Bezpieczeństwo: 'updates.changelogPreview.shortLabels.security',
  };
  const k = keyMap[label];
  return k ? tDynamic(i18n, `settings:${k}`) : label;
}
