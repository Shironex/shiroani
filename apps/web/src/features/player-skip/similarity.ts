/**
 * Jaro-Winkler similarity between two strings.
 *
 * Returns a value in [0, 1] where 1 is a perfect match.
 * Weights prefix matches more heavily than plain Jaro — useful for anime
 * titles where the first few characters are highly discriminative.
 *
 * No external dependencies. ~45 lines of pure logic.
 */

const WINKLER_PREFIX_SCALE = 0.1;
const WINKLER_MAX_PREFIX_LEN = 4;

function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  if (matchWindow < 0) return 0;

  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);

    for (let j = start; j < end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Jaro-Winkler similarity. Prefix weight bonus applies for up to 4 matching
 * leading characters (standard Winkler definition).
 */
export function jaroWinkler(a: string, b: string): number {
  const jaroScore = jaro(a, b);
  if (jaroScore < 0.7) return jaroScore;

  let prefixLen = 0;
  const maxPrefix = Math.min(WINKLER_MAX_PREFIX_LEN, Math.min(a.length, b.length));
  while (prefixLen < maxPrefix && a[prefixLen] === b[prefixLen]) {
    prefixLen++;
  }

  return jaroScore + prefixLen * WINKLER_PREFIX_SCALE * (1 - jaroScore);
}
