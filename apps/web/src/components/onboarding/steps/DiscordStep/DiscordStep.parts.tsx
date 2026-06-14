import { useTranslation } from 'react-i18next';
import { APP_LOGO_URL } from '@/lib/constants';

/**
 * Inline mock of the Discord "Now playing" card, reflecting the live `enabled`
 * toggle — full-colour + example episode when on, greyed-out when off.
 */
export function DiscordPreviewCard({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation('onboarding');

  return (
    <div className="rounded-xl border border-white/5 bg-[oklch(0.18_0.022_260)] p-3.5 text-[oklch(0.96_0.01_260)]">
      <div className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[oklch(0.7_0.02_260)]">
        {enabled ? t('step.discord.preview.watching') : t('step.discord.preview.off')}
      </div>
      <div className="flex gap-2.5">
        <div
          className={
            'relative h-[54px] w-[54px] flex-shrink-0 overflow-hidden rounded-xl border border-white/10' +
            (enabled ? '' : ' grayscale brightness-50')
          }
          style={{
            background: 'linear-gradient(150deg, oklch(0.45 0.17 350), oklch(0.32 0.12 30))',
          }}
        >
          <img
            src={APP_LOGO_URL}
            alt=""
            className="absolute inset-0 m-auto h-9 w-9 object-contain"
            draggable={false}
          />
        </div>
        <div className="min-w-0 flex-1">
          <b className="block text-[13px] font-bold">{t('step.discord.preview.appName')}</b>
          <p className="truncate text-[11.5px] text-[oklch(0.85_0.015_260)]">
            {enabled ? t('step.discord.preview.exampleTitle') : t('step.discord.preview.off')}
          </p>
          {enabled && (
            <small className="block font-mono text-[10px] text-[oklch(0.7_0.02_260)]">
              {t('step.discord.preview.exampleEpisode')}
            </small>
          )}
        </div>
      </div>
    </div>
  );
}
