import { Trans, useTranslation } from 'react-i18next';
import type { IGreetingSubtitleProps } from './GreetingBanner.types';

export function GreetingSubtitle({
  episodesWaiting,
  unreadFeedCount,
  todayCount,
}: IGreetingSubtitleProps) {
  const { t } = useTranslation('browser');
  const hasActionableNews = episodesWaiting > 0 || unreadFeedCount > 0;
  const boldStrong = <b className="font-semibold text-foreground" />;

  if (hasActionableNews) {
    return (
      <p className="mt-1 text-[13px] text-muted-foreground">
        {episodesWaiting > 0 && (
          <Trans
            ns="browser"
            i18nKey="newTab.greeting.subtitle.episodesWaiting"
            count={episodesWaiting}
            components={{ 1: boldStrong }}
          />
        )}
        {episodesWaiting > 0 && unreadFeedCount > 0 && ' · '}
        {unreadFeedCount > 0 && (
          <Trans
            ns="browser"
            i18nKey="newTab.greeting.subtitle.feedUnread"
            count={unreadFeedCount}
            components={{ 1: boldStrong }}
          />
        )}
      </p>
    );
  }

  if (todayCount > 0) {
    return (
      <p className="mt-1 text-[13px] text-muted-foreground">
        <Trans
          ns="browser"
          i18nKey="newTab.greeting.subtitle.todaySchedule"
          count={todayCount}
          components={{ 1: boldStrong }}
        />
      </p>
    );
  }

  return (
    <p className="mt-1 text-[13px] text-muted-foreground">
      {t('newTab.greeting.subtitle.default')}
    </p>
  );
}
