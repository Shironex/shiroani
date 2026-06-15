import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { tDynamic } from '@/lib/i18n';
import {
  getChangelogReleases,
  CHANGELOG_CATEGORY_VARIANT,
  type ChangelogCategoryKind,
} from '@/lib/changelog-entries';
import type {
  ILatestReleaseHighlightRow,
  ILatestReleaseHighlightsView,
} from './LatestReleaseHighlights.types';

function variantFor(kind: keyof typeof CHANGELOG_CATEGORY_VARIANT) {
  return CHANGELOG_CATEGORY_VARIANT[kind];
}

// Map the stable category kind (language-agnostic) to its localized short tag.
// Keying off `kind` rather than the localized label keeps the mapping robust
// when the changelog source ships English (or any non-PL) labels.
const KIND_TO_SHORT: Partial<Record<ChangelogCategoryKind, string>> = {
  feature: 'updates.changelogPreview.shortLabels.new',
  fix: 'updates.changelogPreview.shortLabels.fix',
  polish: 'updates.changelogPreview.shortLabels.polish',
  security: 'updates.changelogPreview.shortLabels.security',
};

/** Shorten category labels so the pill stays compact. */
function shortLabel(kind: ChangelogCategoryKind, label: string, i18n: I18nInstance): string {
  const k = KIND_TO_SHORT[kind];
  return k ? tDynamic(i18n, `settings:${k}`) : label;
}

/**
 * Derives the latest release and a capped (4-line) preview of its changes,
 * flattening the release's categories into (variant, label, entry) rows.
 */
export function useLatestReleaseHighlights(): ILatestReleaseHighlightsView {
  const { i18n } = useTranslation('settings');
  const latest = getChangelogReleases(i18n.language)[0];

  const rows: ILatestReleaseHighlightRow[] = [];
  if (latest) {
    const MAX_ROWS = 4;
    for (const cat of latest.categories) {
      for (const entry of cat.entries) {
        if (rows.length >= MAX_ROWS) break;
        rows.push({
          variant: variantFor(cat.kind),
          label: shortLabel(cat.kind, cat.label, i18n),
          entry,
        });
      }
      if (rows.length >= MAX_ROWS) break;
    }
  }

  return { latest, rows };
}
