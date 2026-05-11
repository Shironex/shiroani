import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Locale-aware relative-time formatter for feed items.
 *
 * Memoizes `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat` at hook
 * scope keyed on `i18n.language`. Feed views render 20–100 items and the
 * returned function is called once per item per render — constructing a
 * fresh RTF per call (which is ~5–10× more expensive than `format()`)
 * was wasteful when the locale is identical for every item.
 */
export function useTimeAgo(): (dateString: string) => string {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const rtf = useMemo(() => new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }), [lang]);
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    [lang]
  );
  return useCallback(
    (dateString: string) => {
      const now = Date.now();
      const date = new Date(dateString).getTime();
      if (Number.isNaN(date)) return '';
      const diffSeconds = Math.max(0, Math.floor((now - date) / 1000));
      if (diffSeconds < 60) return rtf.format(-diffSeconds, 'second');
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return rtf.format(-diffHours, 'hour');
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return rtf.format(-diffDays, 'day');
      // Fall back to a short locale date string for older items.
      try {
        return dateFmt.format(new Date(dateString));
      } catch {
        return new Date(dateString).toLocaleDateString();
      }
    },
    [rtf, dateFmt]
  );
}
