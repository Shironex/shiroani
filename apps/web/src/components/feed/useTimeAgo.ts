import { useTranslation } from 'react-i18next';

/**
 * Locale-aware relative-time formatter for feed items.
 *
 * Mirrors `UpdatesSection`'s inline `Intl.RelativeTimeFormat` pattern
 * (the i18n audit explicitly prefers inline over a duplicate shared
 * helper). The shared `timeAgo` from `@shiroani/shared` is hardcoded to
 * Polish and lives in a package this slice cannot modify.
 */
export function useTimeAgo(): (dateString: string) => string {
  const { i18n } = useTranslation();
  return (dateString: string) => {
    const now = Date.now();
    const date = new Date(dateString).getTime();
    if (Number.isNaN(date)) return '';
    const diffSeconds = Math.max(0, Math.floor((now - date) / 1000));
    const rtf = new Intl.RelativeTimeFormat(i18n.language || 'en', { numeric: 'auto' });
    if (diffSeconds < 60) return rtf.format(-diffSeconds, 'second');
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return rtf.format(-diffHours, 'hour');
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return rtf.format(-diffDays, 'day');
    // Fall back to a short locale date string for older items.
    try {
      return new Date(dateString).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return new Date(dateString).toLocaleDateString();
    }
  };
}
