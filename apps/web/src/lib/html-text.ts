/**
 * HTML → plain-text helpers.
 *
 * The web bundle does not ship an HTML sanitiser, so anywhere we render
 * untrusted markup (AniList descriptions, RSS `description` fields) we strip
 * the tags to plain text instead of using `dangerouslySetInnerHTML`.
 *
 * Three call sites historically hand-rolled slightly different variants:
 * - `stripHtml` — collapse `<br>` to newlines, drop tags, normalise blank
 *   lines, trim. Used for AniList synopses.
 * - `htmlToParagraphs` — richer RSS handling (block breaks, list bullets,
 *   entity decoding) returning trimmed paragraphs.
 * - `stripHtmlSimple` — bare `<br>` → newline then tag strip, no trimming or
 *   newline collapsing (preserves the exact output the schedule dialog relied
 *   on, including its `<[^>]*>` tag pattern that also matches empty `<>`).
 */

/**
 * Strip HTML tags and normalise whitespace into a trimmed plain-text string.
 * `<br>` becomes a single newline; runs of 3+ newlines collapse to a blank
 * line; leading/trailing whitespace is removed.
 */
export function stripHtml(s?: string): string {
  if (!s) return '';
  return s
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert `<br>` to newlines then strip remaining tags, without trimming or
 * collapsing blank lines. The tag pattern intentionally uses `<[^>]*>` (also
 * matches an empty `<>`), matching the schedule info dialog's original inline
 * implementation byte-for-byte.
 */
export function stripHtmlSimple(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
}

/**
 * Convert untrusted HTML (e.g. an RSS `description`) into an array of trimmed
 * plain-text paragraphs:
 * - block-level closes (`</p>`, `</div>`, `</hN>`, `</li>`, `</blockquote>`)
 *   become paragraph breaks; `<li>` opens become bullet prefixes
 * - a small set of common HTML entities is decoded
 * - paragraphs are split on blank lines, internal whitespace is collapsed, and
 *   empty paragraphs are dropped
 */
export function htmlToParagraphs(html: string): string[] {
  // Normalise common block breaks to double newlines
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ');

  // Strip remaining tags
  const stripped = withBreaks.replace(/<[^>]+>/g, '');

  // Decode a small set of common entities
  const decoded = stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”');

  // Split into paragraphs and drop empties
  return decoded
    .split(/\n{2,}/)
    .map(p =>
      p
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);
}
