/**
 * In-app changelog adapter.
 *
 * The canonical release data lives in the `@shiroani/changelog` workspace
 * package and is shared with the marketing landing page. That package is
 * bilingual (PL + EN); this adapter exposes a `getChangelogReleases(locale)`
 * helper that flattens each release to the active UI language, and owns the
 * mapping from `category.kind` → `PillTag` variant (the presentation concern
 * that shouldn't leak into the shared package).
 */
import {
  localizeReleases,
  RELEASES,
  type CategoryKind,
  type Locale,
  type ReleaseType,
  type ResolvedRelease,
} from '@shiroani/changelog';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from '@shiroani/shared';

export type ChangelogCategoryKind = CategoryKind;
export type ChangelogReleaseType = ReleaseType;
/** A release flattened to one locale — what the in-app view renders. */
export type ChangelogRelease = ResolvedRelease;

/** Total number of releases (locale-neutral) — used for filter counts. */
export const CHANGELOG_RELEASE_COUNT = RELEASES.length;

/**
 * Localized release list for in-app rendering. Falls back to {@link DEFAULT_LANGUAGE}
 * for any language that isn't one the changelog ships copy for.
 */
export function getChangelogReleases(language: string): ChangelogRelease[] {
  const locale: Locale = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
  return localizeReleases(locale);
}

/**
 * PillTag variant used for each changelog category kind. Kept in sync with
 * the design mock's `--cat-*` color tokens.
 */
export const CHANGELOG_CATEGORY_VARIANT: Record<
  ChangelogCategoryKind,
  'accent' | 'green' | 'blue' | 'orange' | 'muted' | 'gold'
> = {
  feature: 'accent',
  fix: 'green',
  polish: 'blue',
  security: 'orange',
  feed: 'orange',
  macos: 'blue',
  app: 'accent',
  bot: 'muted',
};
