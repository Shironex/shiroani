import type { DiscordActivityType } from '@shiroani/shared';

export interface IDiscordPreviewProps {
  details: string;
  state: string;
  showTimestamp: boolean;
  showLargeImage: boolean;
  showButton: boolean;
  activityType: DiscordActivityType;
}

export interface IDiscordPreviewView {
  readonly isWatching: boolean;
}
