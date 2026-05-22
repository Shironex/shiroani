import { useTranslation, Trans } from 'react-i18next';
import { FolderOpen, Globe, Heart, History, Sparkles } from 'lucide-react';
import { APP_NAME } from '@shiroani/shared';
import { APP_LOGO_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { PillTag } from '@/components/ui/pill-tag';
import { useAppStore } from '@/stores/useAppStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAppVersion } from '@/hooks/useAppVersion';
import { SettingsCard } from '@/components/settings/SettingsCard';

export function AboutSection() {
  const { t } = useTranslation('settings');
  const version = useAppVersion('');
  const resetOnboarding = useOnboardingStore(s => s.reset);

  const heroIcon = (
    <div className="w-[42px] h-[42px] rounded-xl bg-primary/10 border border-border-glass flex items-center justify-center overflow-hidden flex-shrink-0">
      <img
        src={APP_LOGO_URL}
        alt={t('about.logoAlt')}
        className="w-9 h-9 object-contain"
        draggable={false}
      />
    </div>
  );

  const heroSubtitle = (
    <span className="inline-flex flex-wrap items-center gap-2">
      <PillTag variant="accent">v{version || '...'}</PillTag>
      <span className="text-[11.5px] text-muted-foreground">{t('about.tagline')}</span>
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Hero: logo + name + version + CTA row */}
      <SettingsCard iconSlot={heroIcon} title={APP_NAME} subtitle={heroSubtitle}>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={resetOnboarding}>
            <Sparkles className="w-3.5 h-3.5" />
            {t('about.rerunOnboarding')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border-glass"
            onClick={() => window.open('https://github.com/Shironex/shiroani', '_blank')}
          >
            <Globe className="w-3.5 h-3.5" />
            {t('about.github')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border-glass"
            onClick={() => useAppStore.getState().navigateTo('changelog')}
          >
            <History className="w-3.5 h-3.5" />
            {t('about.openChangelog')}
          </Button>
        </div>
        <p className="text-[11.5px] text-muted-foreground/80 leading-relaxed">
          {t('about.onboardingHint')}
        </p>
      </SettingsCard>

      {/* Story */}
      <SettingsCard
        icon={Heart}
        title={t('about.story.title')}
        subtitle={t('about.story.subtitle')}
      >
        <div className="space-y-2.5 text-[13px] leading-[1.7] text-foreground/85">
          <p>
            <Trans
              i18nKey="about.story.p1"
              t={t}
              components={{ 1: <b className="font-bold text-primary" /> }}
            />
          </p>
          <p>{t('about.story.p2')}</p>
          <p>
            <Trans
              i18nKey="about.story.p3"
              t={t}
              components={{ 1: <b className="font-bold text-primary" /> }}
            />
          </p>
        </div>
      </SettingsCard>

      {/* Logs */}
      {window.electronAPI?.app?.openLogsFolder && (
        <SettingsCard
          icon={FolderOpen}
          title={t('about.logs.title')}
          subtitle={t('about.logs.subtitle')}
          tone="muted"
        >
          <Button
            variant="outline"
            size="sm"
            className="border-border-glass gap-2"
            onClick={() => window.electronAPI?.app?.openLogsFolder()}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {t('about.logs.action')}
          </Button>
        </SettingsCard>
      )}
    </div>
  );
}
