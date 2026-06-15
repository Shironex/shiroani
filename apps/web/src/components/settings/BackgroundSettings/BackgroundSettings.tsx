import { Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BackgroundPanel } from '@/components/shared/BackgroundPanel';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { useBackgroundSettings } from './BackgroundSettings.hooks';
import type { IBackgroundSettingsProps } from './BackgroundSettings.types';

export default function BackgroundSettings(props: IBackgroundSettingsProps) {
  const { t } = useTranslation('settings');
  useBackgroundSettings(props);

  return (
    <SettingsCard
      icon={Image}
      title={t('background.card.title')}
      subtitle={t('background.card.subtitle')}
    >
      <BackgroundPanel variant="card" />
    </SettingsCard>
  );
}
