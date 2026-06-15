import { Boxes } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { useSuiteSection } from './SuiteSection.hooks';
import { APPS, SiblingAppCard } from './SuiteSection.parts';
import type { ISuiteSectionProps } from './SuiteSection.types';

export default function SuiteSection(props: ISuiteSectionProps) {
  const { t } = useTranslation('settings');
  useSuiteSection(props);

  const appCards = APPS.map(app => <SiblingAppCard key={app.id} app={app} />);

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Boxes}
        title={t('suite.card.title')}
        subtitle={t('suite.card.subtitle')}
      />

      <div className="space-y-4">{appCards}</div>
    </div>
  );
}
