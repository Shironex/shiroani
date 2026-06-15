import type { getChangelogReleases, CHANGELOG_CATEGORY_VARIANT } from '@/lib/changelog-entries';

type ChangelogRelease = ReturnType<typeof getChangelogReleases>[number];
type PillVariant = (typeof CHANGELOG_CATEGORY_VARIANT)[keyof typeof CHANGELOG_CATEGORY_VARIANT];

export interface ILatestReleaseHighlightRow {
  variant: PillVariant;
  label: string;
  entry: string;
}

export type ILatestReleaseHighlightsProps = Record<string, never>;

export interface ILatestReleaseHighlightsView {
  readonly latest: ChangelogRelease | undefined;
  readonly rows: ILatestReleaseHighlightRow[];
}
