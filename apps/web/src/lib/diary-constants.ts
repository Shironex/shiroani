import { Sparkles, Heart, Minus, ThumbsDown, Frown, type LucideIcon } from 'lucide-react';
import type { DiaryMood } from '@shiroani/shared';
import i18n from '@/lib/i18n';

/**
 * Diary cover gradient definitions. The display label lives behind a
 * `labelKey` (in the `diary` namespace, `gradient.<id>`) so the picker
 * tooltip swaps with the active language. Consumers should resolve the
 * label via `t(g.labelKey)`.
 */
export const DIARY_GRADIENTS: Record<string, { labelKey: string; css: string }> = {
  sakura: {
    labelKey: 'gradient.sakura',
    css: 'linear-gradient(135deg, #FF92A8 0%, #FFB7C5 50%, #FFC8D6 100%)',
  },
  twilight: {
    labelKey: 'gradient.twilight',
    css: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 50%, #C4B5FD 100%)',
  },
  ocean: {
    labelKey: 'gradient.ocean',
    css: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 50%, #7DD3FC 100%)',
  },
  matcha: {
    labelKey: 'gradient.matcha',
    css: 'linear-gradient(135deg, #15803D 0%, #4ADE80 50%, #86EFAC 100%)',
  },
  amber: {
    labelKey: 'gradient.amber',
    css: 'linear-gradient(135deg, #B45309 0%, #F59E0B 50%, #FCD34D 100%)',
  },
  coral: {
    labelKey: 'gradient.coral',
    css: 'linear-gradient(135deg, #DC2626 0%, #FB7185 50%, #FECDD3 100%)',
  },
  mist: {
    labelKey: 'gradient.mist',
    css: 'linear-gradient(135deg, #475569 0%, #94A3B8 50%, #CBD5E1 100%)',
  },
  lavender: {
    labelKey: 'gradient.lavender',
    css: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 50%, #E9D5FF 100%)',
  },
  mint: {
    labelKey: 'gradient.mint',
    css: 'linear-gradient(135deg, #0D9488 0%, #5EEAD4 50%, #99F6E4 100%)',
  },
  cyber: {
    labelKey: 'gradient.cyber',
    css: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #6366F1 100%)',
  },
  starlight: {
    labelKey: 'gradient.starlight',
    css: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #818CF8 100%)',
  },
  peach: {
    labelKey: 'gradient.peach',
    css: 'linear-gradient(135deg, #FB923C 0%, #FDBA74 50%, #FED7AA 100%)',
  },
};

export const MOOD_ICONS: Record<DiaryMood, { Icon: LucideIcon; color: string }> = {
  great: { Icon: Sparkles, color: 'text-yellow-400' },
  good: { Icon: Heart, color: 'text-pink-400' },
  neutral: { Icon: Minus, color: 'text-muted-foreground' },
  bad: { Icon: ThumbsDown, color: 'text-orange-400' },
  terrible: { Icon: Frown, color: 'text-red-400' },
};

export const MOOD_EMOJI: Record<DiaryMood, string> = {
  great: '✨',
  good: '💗',
  neutral: '😐',
  bad: '😕',
  terrible: '😡',
};

/**
 * Mood pill descriptors. `labelKey` resolves under the `diary` namespace
 * (`mood.<value>`); use `t(opt.labelKey)` to render.
 */
export const MOOD_OPTIONS: {
  value: DiaryMood;
  labelKey: string;
  Icon: typeof Sparkles;
  color: string;
}[] = [
  { value: 'great', labelKey: 'mood.great', Icon: Sparkles, color: 'text-yellow-400' },
  { value: 'good', labelKey: 'mood.good', Icon: Heart, color: 'text-pink-400' },
  { value: 'neutral', labelKey: 'mood.neutral', Icon: Minus, color: 'text-muted-foreground' },
  { value: 'bad', labelKey: 'mood.bad', Icon: ThumbsDown, color: 'text-orange-400' },
  { value: 'terrible', labelKey: 'mood.terrible', Icon: Frown, color: 'text-red-400' },
];

/**
 * Format a date in the active UI locale's short style (e.g. "15 sty 2024"
 * for PL, "Jun 15, 2025" for EN). Uses `Intl.DateTimeFormat` directly so
 * the output tracks `i18n.language` instead of being pinned to PL.
 */
export const formatDate = (dateStr: string): string => {
  const locale = i18n.language || 'en';
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
