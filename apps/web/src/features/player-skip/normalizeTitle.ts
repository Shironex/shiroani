/**
 * Normalize an anime title for fuzzy comparison.
 *
 * Rules (per Q3 in the plan decisions log):
 * - Lowercase
 * - Replace hyphens with spaces
 * - Strip non-alphanumeric characters (except spaces)
 * - Collapse runs of whitespace to a single space
 * - Trim leading/trailing whitespace
 *
 * No diacritic folding — Polish characters are preserved as-is.
 *
 * Examples:
 *   "Steins;Gate"                        → "steinsgate"
 *   "tsue-to-tsurugi-no-wistoria-2"     → "tsue to tsurugi no wistoria 2"
 *   "  Attack on Titan  "               → "attack on titan"
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
