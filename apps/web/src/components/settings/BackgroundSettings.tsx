import { Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BackgroundPanel } from '@/components/shared/BackgroundPanel';
import { SettingsCard } from '@/components/settings/SettingsCard';

export function BackgroundSettings() {
  const { t } = useTranslation('settings');
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
