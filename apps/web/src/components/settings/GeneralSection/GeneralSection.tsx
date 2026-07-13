import { useTranslation, Trans } from 'react-i18next';
import { Languages, Settings, Sparkles, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  SettingsCard,
  SettingsInfoCallout,
  SettingsRow,
  SettingsRowLabel,
  SettingsSectionSkeleton,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import {
  DISPLAY_NAME_MAX_LENGTH,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@shiroani/shared';
import { persistLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { selectableChip } from '@/components/settings/chip-styles';
import { useGeneralSection } from './GeneralSection.hooks';
import type { IGeneralSectionProps } from './GeneralSection.types';

export default function GeneralSection(props: IGeneralSectionProps) {
  const { t, i18n } = useTranslation('settings');
  const {
    autoLaunch,
    feedRefreshOnStartup,
    loaded,
    displayName,
    setDisplayName,
    handleAutoLaunchChange,
    handleFeedRefreshOnStartupChange,
  } = useGeneralSection(props);

  async function handleLanguageChange(lang: SupportedLanguage) {
    await i18n.changeLanguage(lang);
    persistLanguage(lang);
  }

  if (!loaded) return <SettingsSectionSkeleton cards={3} />;

  const languageButtons = SUPPORTED_LANGUAGES.map(lang => {
    const isActive = i18n.language === lang.code;
    return (
      <button
        key={lang.code}
        type="button"
        aria-pressed={isActive}
        onClick={() => {
          void handleLanguageChange(lang.code);
        }}
        className={cn(
          'rounded-lg border px-3 py-1.5 text-xs font-medium',
          'transition-[color,background-color,border-color,transform] active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          selectableChip(isActive),
          isActive && 'font-semibold'
        )}
      >
        {lang.label}
      </button>
    );
  });

  return (
    <div className="space-y-4">
      <SettingsCard icon={Languages} title={t('app.languageTitle')}>
        <div className="px-3">
          <p className="text-xs text-muted-foreground mb-3">{t('app.languageDesc')}</p>
          <div className="flex items-center gap-1.5">{languageButtons}</div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={UserRound}
        title={t('general.profileCard.title')}
        subtitle={t('general.profileCard.subtitle')}
      >
        <SettingsRow stacked>
          <SettingsRowLabel
            id="display-name-label"
            title={t('general.displayName.title')}
            description={t('general.displayName.description')}
          />
          <Input
            id="display-name-input"
            aria-labelledby="display-name-label"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={t('general.displayName.placeholder')}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            className="h-9 text-[13.5px]"
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        icon={Settings}
        title={t('general.appCard.title')}
        subtitle={t('general.appCard.subtitle')}
      >
        <SettingsToggleRow
          id="auto-launch-label"
          title={t('general.autoLaunch.title')}
          description={t('general.autoLaunch.description')}
          checked={autoLaunch}
          onCheckedChange={handleAutoLaunchChange}
        />

        <SettingsToggleRow
          divider
          id="feed-startup-refresh-label"
          title={t('general.feedRefreshOnStartup.title')}
          description={t('general.feedRefreshOnStartup.description')}
          checked={feedRefreshOnStartup}
          onCheckedChange={handleFeedRefreshOnStartupChange}
        />
      </SettingsCard>

      {/* Info callout matching the mock's .info-box */}
      <SettingsInfoCallout
        icon={Sparkles}
        iconClassName="w-[18px] h-[18px] flex-shrink-0 text-gold"
        align="center"
        as="span"
      >
        <Trans
          i18nKey="general.restartCallout"
          t={t}
          components={{ 1: <b className="font-semibold text-foreground" /> }}
        />
      </SettingsInfoCallout>
    </div>
  );
}
