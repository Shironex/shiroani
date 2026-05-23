import { useTranslation, Trans } from 'react-i18next';
import { Coffee, Heart, HeartHandshake } from 'lucide-react';
import { BUY_ME_A_COFFEE_URL, GITHUB_SPONSORS_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/SettingsCard';

function openCoffeeLink() {
  window.open(BUY_ME_A_COFFEE_URL, '_blank', 'noopener,noreferrer');
}

function openSponsorsLink() {
  window.open(GITHUB_SPONSORS_URL, '_blank', 'noopener,noreferrer');
}

export function SupportSection() {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Heart}
        title={t('support.card.title')}
        subtitle={t('support.card.subtitle')}
        tone="orange"
      >
        <div className="space-y-2.5 text-[13px] leading-[1.7] text-foreground/85">
          <p>{t('support.card.p1')}</p>
          <p>
            <Trans
              i18nKey="support.card.p2"
              t={t}
              components={{ 1: <b className="font-bold text-primary" /> }}
            />
          </p>
          <p>{t('support.card.p3')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={openCoffeeLink}>
            <Coffee className="w-3.5 h-3.5" />
            {t('support.action')}
          </Button>
          <Button size="sm" variant="outline" onClick={openSponsorsLink}>
            <HeartHandshake className="w-3.5 h-3.5" />
            {t('support.sponsor')}
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}
