import type { IDiscordPreviewProps, IDiscordPreviewView } from './DiscordPreview.types';

export function useDiscordPreview({ activityType }: IDiscordPreviewProps): IDiscordPreviewView {
  const isWatching = activityType === 'watching' || activityType === 'diary';
  return { isWatching };
}
