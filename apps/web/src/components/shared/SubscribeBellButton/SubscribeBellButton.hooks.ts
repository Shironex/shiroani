import { useNotificationToggle } from '@/hooks/useNotificationToggle';
import type { AiringAnime } from '@shiroani/shared';
import type { ISubscribeBellButtonView } from './SubscribeBellButton.types';

export function useSubscribeBellButton(anime: AiringAnime): ISubscribeBellButtonView {
  const mediaId = anime.media.id;
  const { isSubscribed, toggle } = useNotificationToggle(mediaId, anime);
  return { isSubscribed, toggle, mediaId };
}
