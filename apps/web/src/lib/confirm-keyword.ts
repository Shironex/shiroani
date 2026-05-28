/**
 * Case- and diacritic-insensitive match for type-to-confirm prompts.
 *
 * The user must retype a keyword (e.g. "USUŃ" / "DELETE") to arm an
 * irreversible action. Matching is forgiving on purpose: on a non-Polish
 * keyboard layout "USUN" should pass for "USUŃ" just as well, and trailing
 * whitespace / casing shouldn't block a correct word.
 */
export function confirmKeywordMatches(input: string, keyword: string): boolean {
  return normalizeConfirm(input) === normalizeConfirm(keyword);
}

function normalizeConfirm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}
