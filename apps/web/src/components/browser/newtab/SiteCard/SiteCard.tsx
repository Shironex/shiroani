import { useTranslation } from 'react-i18next';
import { X, Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteCard } from './SiteCard.hooks';
import type { ISiteCardProps } from './SiteCard.types';

/**
 * Individual site card — neutral glass tile with a large, faint site-logo
 * overlay instead of random gradients + first-letter kanji. Each tile reads
 * as "this site" because the brand logo (e.g. YouTube red play, Google mark)
 * fills the bottom-right at low opacity.
 */
export default function SiteCard({ site, onClick, onRemove }: ISiteCardProps) {
  const { t } = useTranslation('browser');
  const { faviconError, setFaviconError, logoError, setLogoError, displayHost, logoUrl } =
    useSiteCard(site);

  const showLogo = logoUrl && !logoError;
  const showHostLine = displayHost && displayHost !== site.name;
  const showTextFallback = !logoUrl || logoError;

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={cn(
          'relative flex aspect-[1.7] w-full flex-col justify-between overflow-hidden',
          'rounded-[10px] border border-border-glass bg-card/50 p-2.5',
          'transition-all cursor-pointer',
          'hover:border-primary/40 hover:bg-card/70',
          'hover:shadow-[0_4px_14px_-6px_oklch(from_var(--primary)_l_c_h/0.5)]'
        )}
      >
        {/* Large logo overlay — replaces the old first-letter kanji + gradient.
            Positioned bottom-right, clipped by the tile's overflow-hidden so
            any overshoot stays inside the card. */}
        {showLogo && (
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setLogoError(true)}
            className={cn(
              'pointer-events-none absolute -right-3 -bottom-3',
              'h-[84px] w-[84px] object-contain opacity-25',
              'transition-all duration-200',
              'group-hover:opacity-40 group-hover:scale-105'
            )}
          />
        )}

        {/* Soft highlight at the top-left corner so dark tiles don't look flat */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,oklch(from_var(--foreground)_l_c_h/0.05),transparent_60%)]"
        />

        <span className="relative z-[1] flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {site.icon && !faviconError ? (
            <img
              src={site.icon}
              alt=""
              className="size-3 rounded-[2px]"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe2 className="w-3 h-3" />
          )}
          <span className="truncate">
            {site.isPredefined
              ? t('newTab.quickAccess.tile.saved')
              : (displayHost ?? t('newTab.quickAccess.tile.site'))}
          </span>
        </span>

        <span className="relative z-[1] min-w-0">
          <span className="block truncate text-[12.5px] font-bold text-foreground leading-tight">
            {site.name}
          </span>
          {showHostLine && (
            <span className="mt-0.5 block truncate font-mono text-[9.5px] text-muted-foreground/70">
              {displayHost}
            </span>
          )}
        </span>

        {/* Text-only fallback when the logo fails to load — keeps tile visually
            anchored instead of going blank */}
        {showTextFallback && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute right-[-6px] bottom-[-14px]',
              'font-serif text-[52px] font-extrabold leading-none select-none'
            )}
            style={{ color: 'oklch(from var(--foreground) l c h / 0.08)' }}
          >
            {site.name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={t('newTab.quickAccess.removeAria')}
        className="absolute top-1.5 right-1.5 z-10 grid size-5 place-items-center rounded-full bg-black/50 text-white/80 opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100 group-focus-within:opacity-100 cursor-pointer"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
