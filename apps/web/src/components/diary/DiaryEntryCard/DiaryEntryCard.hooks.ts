import { useTranslation } from 'react-i18next';
import type { DiaryEntry } from '@shiroani/shared';
import { DIARY_GRADIENTS, MOOD_ICONS, formatDate } from '@/lib/diary-constants';
import type { IDiaryEntryCardView } from './DiaryEntryCard.types';

const DEFAULT_GRADIENT = 'linear-gradient(135deg, var(--muted) 0%, var(--accent) 100%)';

interface ITipTapNode {
  text?: string;
  content?: ITipTapNode[];
}

function extractPreview(contentJson: string): string {
  try {
    const doc = JSON.parse(contentJson);
    const texts: string[] = [];
    const walk = (node: ITipTapNode) => {
      if (node.text) texts.push(node.text);
      if (node.content) node.content.forEach(walk);
    };
    walk(doc);
    return texts.join(' ').slice(0, 200);
  } catch {
    return '';
  }
}

export function useDiaryEntryCard(entry: DiaryEntry): IDiaryEntryCardView {
  const { t } = useTranslation('diary');
  const gradient = entry.coverGradient
    ? (DIARY_GRADIENTS[entry.coverGradient]?.css ?? DEFAULT_GRADIENT)
    : DEFAULT_GRADIENT;
  const preview = extractPreview(entry.contentJson);
  const moodInfo = entry.mood ? MOOD_ICONS[entry.mood] : null;

  return {
    gradient,
    preview,
    title: entry.title || t('untitled'),
    date: formatDate(entry.createdAt),
    pinLabel: entry.isPinned ? t('card.unpin') : t('card.pin'),
    removeLabel: t('card.remove'),
    MoodIcon: moodInfo?.Icon ?? null,
    moodColor: moodInfo?.color ?? null,
    tags: entry.tags?.slice(0, 2) ?? [],
  };
}
