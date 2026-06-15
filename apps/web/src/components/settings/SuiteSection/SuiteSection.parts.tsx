import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PillTag } from '@/components/ui/pill-tag';

export type SuiteAppId = 'shiranami' | 'kireimanga';

export interface SiblingApp {
  id: SuiteAppId;
  kanji: string;
  romaji: string;
  url: string;
  hostname: string;
  iconSrc: string;
  previewSrc: string;
  /** Per-app accent colour expressed as an oklch tuple ("L C H") so we can compose it inline. */
  accent: string;
}

const SUITE_ASSET_BASE = `${import.meta.env.BASE_URL}suite/`;

export const APPS: SiblingApp[] = [
  {
    id: 'shiranami',
    kanji: '白波',
    romaji: 'Shiranami',
    url: 'https://shiranami.app',
    hostname: 'shiranami.app',
    iconSrc: `${SUITE_ASSET_BASE}shiranami-icon.png`,
    previewSrc: `${SUITE_ASSET_BASE}shiranami-preview.png`,
    accent: '0.68 0.15 295',
  },
  {
    id: 'kireimanga',
    kanji: '綺麗漫画',
    romaji: 'KireiManga',
    url: 'https://kireimanga.app',
    hostname: 'kireimanga.app',
    iconSrc: `${SUITE_ASSET_BASE}kireimanga-icon.png`,
    previewSrc: `${SUITE_ASSET_BASE}kireimanga-preview.png`,
    accent: '0.62 0.2 25',
  },
];

export function SiblingAppCard({ app }: { app: SiblingApp }) {
  const { t } = useTranslation('settings');
  const tagline = t(`suite.${app.id}.tagline`);
  const description = t(`suite.${app.id}.description`);
  const previewAlt = t(`suite.${app.id}.previewAlt`);
  const accentSurface = `oklch(${app.accent} / 0.10)`;
  const accentBorder = `oklch(${app.accent} / 0.32)`;
  const accentGlow = `oklch(${app.accent} / 0.55)`;
  const accentSolid = `oklch(${app.accent})`;
  const accentInk = `oklch(0.14 0.02 290)`;

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border-glass bg-card/40 backdrop-blur-sm',
        'transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out',
        'hover:-translate-y-[2px] hover:bg-card/60',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0'
      )}
      style={
        {
          '--accent-border-hover': accentBorder,
        } as React.CSSProperties
      }
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accentBorder;
        e.currentTarget.style.boxShadow = `0 22px 50px -22px ${accentGlow}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Decorative kanji watermark — anchors the Japanese aesthetic and tints with the app accent on hover. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-[-22px] bottom-[-44px] select-none',
          'font-serif font-extrabold leading-none tracking-[-0.05em]',
          'opacity-[0.06] transition-[opacity,transform] duration-500 ease-out',
          'group-hover:opacity-[0.16] group-hover:scale-105',
          'motion-reduce:transition-none'
        )}
        style={{ fontSize: 188, color: accentSolid }}
      >
        {app.kanji}
      </span>

      {/* Hero screenshot — peeks into the card and lifts on hover. */}
      <div
        className={cn(
          'relative mx-4 mt-4 overflow-hidden rounded-xl border',
          'aspect-[16/8.4] bg-background/40'
        )}
        style={{ borderColor: accentBorder }}
      >
        {/* Soft accent vignette that brightens on hover. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-90"
          style={{
            background: `radial-gradient(120% 80% at 100% 0%, ${accentSurface}, transparent 65%)`,
          }}
        />
        <img
          src={app.previewSrc}
          alt={previewAlt}
          loading="lazy"
          draggable={false}
          className={cn(
            'relative h-full w-full object-cover object-top',
            'transition-transform duration-500 ease-out',
            'group-hover:scale-[1.035]',
            'motion-reduce:transition-none motion-reduce:group-hover:scale-100'
          )}
        />
        {/* Top fade for contrast under the floating chibi badge. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/35 to-transparent"
        />
        {/* Chibi avatar floats over the screenshot. */}
        <div
          className={cn(
            'absolute left-3 top-3 grid place-items-center size-12 rounded-xl',
            'overflow-hidden border backdrop-blur-md',
            'transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3',
            'motion-reduce:transition-none'
          )}
          style={{
            background: accentSurface,
            borderColor: accentBorder,
          }}
        >
          <img src={app.iconSrc} alt="" draggable={false} className="h-full w-full object-cover" />
        </div>
      </div>

      <div className="relative p-5 pt-4">
        <div className="flex items-baseline gap-2">
          <h3
            className="font-serif font-bold text-[18px] leading-tight tracking-[-0.01em] text-foreground"
            style={{ '--app-accent': accentSolid } as React.CSSProperties}
          >
            {app.romaji}
          </h3>
          <span
            className="font-serif text-[14px] leading-none tracking-tight"
            style={{ color: accentSolid, opacity: 0.85 }}
          >
            {app.kanji}
          </span>
          <span className="ml-auto">
            <PillTag
              variant="muted"
              style={{
                background: accentSurface,
                color: accentSolid,
              }}
            >
              {t('suite.available')}
            </PillTag>
          </span>
        </div>

        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/75">
          {tagline}
        </p>

        <p className="mt-3 text-[13px] leading-[1.65] text-foreground/85">{description}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground/70">
            {app.hostname}
          </span>
          <Button
            size="sm"
            onClick={() => window.open(app.url, '_blank', 'noopener,noreferrer')}
            className="gap-1.5 font-bold"
            style={{
              background: accentSolid,
              color: accentInk,
              boxShadow: `0 6px 16px -6px ${accentGlow}`,
            }}
          >
            {t('suite.openCta', { name: app.romaji })}
            <ArrowUpRight
              className={cn(
                'size-3.5 transition-transform duration-300',
                'group-hover:translate-x-[2px] group-hover:-translate-y-[2px]',
                'motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0'
              )}
            />
          </Button>
        </div>
      </div>
    </article>
  );
}
