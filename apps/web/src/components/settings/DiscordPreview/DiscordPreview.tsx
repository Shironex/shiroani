import { useTranslation } from 'react-i18next';
import { useDiscordPreview } from './DiscordPreview.hooks';
import type { IDiscordPreviewProps } from './DiscordPreview.types';

/** Discord-style presence preview card */
export default function DiscordPreview(props: IDiscordPreviewProps) {
  const { details, state, showTimestamp, showLargeImage, showButton } = props;
  const { t } = useTranslation('settings');
  const { isWatching } = useDiscordPreview(props);

  const showAnilistButton = showButton && isWatching;

  // The hard-coded hex values here (#2b2d31 surface, #5865f2 blurple, #1e1f22
  // tile, #4e5058 button) are intentional — this is a faithful mock of the
  // Discord presence card, so it must use Discord's brand palette rather than
  // the app's theme tokens.
  return (
    <div className="bg-[#2b2d31] rounded-lg p-3 text-white/90 font-sans">
      <p className="text-2xs font-semibold text-white/60 uppercase mb-2">
        {t('discord.preview.playingHeader')}
      </p>
      <div className="flex gap-3">
        {/* Large image */}
        {showLargeImage && (
          <div className="w-[60px] h-[60px] rounded-lg bg-[#1e1f22] shrink-0 flex items-center justify-center overflow-hidden">
            {isWatching ? (
              <div className="w-full h-full bg-gradient-to-br from-[#5865f2]/40 to-[#5865f2]/10 flex items-center justify-center">
                <span className="text-lg">🎬</span>
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#5865f2]/20 to-[#5865f2]/5 flex items-center justify-center">
                <span className="text-2xs font-bold text-white/40">SA</span>
              </div>
            )}
          </div>
        )}

        {/* Text content */}
        <div className="min-w-0 flex flex-col justify-center gap-0.5">
          <p className="text-xs font-semibold text-white truncate">ShiroAni</p>
          {details && <p className="text-xs text-white/70 truncate">{details}</p>}
          {state && <p className="text-xs text-white/70 truncate">{state}</p>}
          {showTimestamp && <p className="text-xs text-white/50">{t('discord.preview.elapsed')}</p>}
        </div>
      </div>

      {/* AniList button */}
      {showAnilistButton && (
        <div className="mt-2">
          <div className="w-full py-1.5 rounded bg-[#4e505899] text-center text-xs font-medium text-white/80">
            {t('discord.preview.anilistButton')}
          </div>
        </div>
      )}
    </div>
  );
}
