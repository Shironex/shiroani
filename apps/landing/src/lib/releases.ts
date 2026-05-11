/**
 * Landing changelog adapter.
 *
 * Release data is sourced from the shared `@shiroani/changelog` package —
 * the single source of truth, also consumed by the in-app view in
 * `apps/web`. That package is bilingual (PL + EN); this adapter takes a
 * `locale` and flattens each release to one language, keeping the field
 * names the landing UI was built against (`dateShort`, `slug`).
 *
 * `currentVersion()` returns the locale-neutral version string and stays
 * argument-free (used by the hero, navbar, footer and suite tagline).
 * `getReleases(locale)` is the localized list; `releases` is the PL list
 * kept for callers that only need locale-neutral fields (e.g. `Download.astro`
 * reads `releases[0].version` / `.dateShort`).
 */
import { localizeReleases, RELEASES, type CategoryKind, type Locale } from '@shiroani/changelog';

export type { Locale };

export type CategorySlug = CategoryKind;

export interface ReleaseCategory {
  slug: CategorySlug;
  label: string;
  // entries are rendered via set:html in ChangelogPage.astro to allow <code> tags.
  // Source is author-controlled static data only — never accept user input here.
  entries: string[];
}

export interface Release {
  version: string;
  date: string;
  dateShort: string;
  title: string;
  description: string;
  type: 'major' | 'minor';
  categories: ReleaseCategory[];
}

/** Localized release list for the changelog page. */
export function getReleases(locale: Locale = 'pl'): Release[] {
  return localizeReleases(locale).map(r => ({
    version: r.version,
    date: r.date,
    dateShort: r.shortDate,
    title: r.title,
    description: r.description,
    type: r.type,
    categories: r.categories.map(c => ({
      slug: c.kind,
      label: c.label,
      entries: c.entries,
    })),
  }));
}

/** PL release list — kept for callers that only need locale-neutral fields. */
export const releases: Release[] = getReleases('pl');

/** Locale-neutral version of the topmost release. */
export const currentVersion = (): string => RELEASES[0].version;

/** PL view of the topmost release. */
export const latestRelease: Release = releases[0];
