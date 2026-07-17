/**
 * Most readable media title (english-first), shared by the profile activity feed
 * and the social notification / activity rows. `fallback` is used when AniList
 * returns no title in any language (callers pass a localized "Untitled").
 */
export function mediaTitle(
  title: { english?: string; romaji?: string; native?: string },
  fallback: string
): string {
  return title.english || title.romaji || title.native || fallback;
}
