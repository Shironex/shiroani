export interface IGreetingBannerProps {
  showName: boolean;
}

export interface IGreetingBannerView {
  readonly displayName: string;
  readonly greeting: string;
  readonly avatarUrl: string | undefined;
  readonly setAvatarError: (value: boolean) => void;
  readonly episodesWaiting: number;
  readonly unreadFeedCount: number;
  readonly todayCount: number;
}

export interface IGreetingSubtitleProps {
  episodesWaiting: number;
  unreadFeedCount: number;
  todayCount: number;
}
