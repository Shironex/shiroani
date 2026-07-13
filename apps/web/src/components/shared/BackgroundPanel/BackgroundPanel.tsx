import { Image as ImageIcon, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useBackgroundPanel } from './BackgroundPanel.hooks';
import { OnboardingSliderRow } from './BackgroundPanel.parts';
import type { IBackgroundPanelProps } from './BackgroundPanel.types';

/**
 * Shared background picker panel. Owns the preview (16:9 with a sakura-gradient
 * fallback), the pick/remove buttons and the opacity + blur sliders. Two
 * variants exist so Settings and Onboarding can reuse the same logic without
 * dropping their surrounding chrome:
 *
 *   - `card`: flat layout — for SettingsCard children.
 *   - `onboarding`: preview + buttons share a rounded bordered frame; sliders
 *     render below in their own bordered rows. Blur is displayed as a
 *     percentage of its max range and sliders are disabled until an image is
 *     set.
 */
export default function BackgroundPanel({
  variant = 'card',
  removeIcon: RemoveIcon,
  removeLabel,
  className,
}: IBackgroundPanelProps) {
  const { t } = useTranslation('settings');
  const {
    customBackground,
    backgroundOpacity,
    backgroundBlur,
    backgroundDim,
    pickBackground,
    removeBackground,
    setBackgroundOpacity,
    setBackgroundBlur,
    setBackgroundDim,
  } = useBackgroundPanel();

  const isOnboarding = variant === 'onboarding';
  const RemoveIconFinal = RemoveIcon ?? (isOnboarding ? RotateCcw : Trash2);
  const removeLabelFinal = removeLabel ?? (isOnboarding ? t('panel.reset') : t('panel.remove'));

  const opacityPct = Math.round(backgroundOpacity * 100);
  const dimPct = Math.round(backgroundDim * 100);
  const blurDisplay = isOnboarding
    ? `${Math.round((backgroundBlur / 20) * 100)}%`
    : `${backgroundBlur}px`;

  // In the onboarding variant, sliders are disabled until a background is set
  // so the empty state reads as "pick an image first".
  const slidersDisabled = isOnboarding && !customBackground;
  const showSliders = isOnboarding || Boolean(customBackground);

  const preview = isOnboarding ? (
    customBackground ? (
      <div
        className="relative flex aspect-[16/9] items-end p-3"
        style={{
          backgroundImage: `url(${customBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <span className="pointer-events-none absolute inset-0 bg-black/20" aria-hidden="true" />
        <span className="relative z-[2] font-serif text-base font-bold text-white drop-shadow-lg">
          {t('panel.labelCustom')}
          <small className="block font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-white/70">
            {t('panel.labelCustomTag')}
          </small>
        </span>
      </div>
    ) : (
      <div
        className="relative grid aspect-[16/9] place-items-center"
        style={{
          background:
            'radial-gradient(ellipse 50% 45% at 30% 30%, oklch(from var(--primary) l c h / 0.5), transparent 60%), radial-gradient(ellipse 50% 40% at 75% 70%, oklch(from var(--primary) calc(l * 0.54) c calc(h - 75) / 0.6), transparent 60%), linear-gradient(135deg, oklch(from var(--background) calc(l * 2.1) calc(c + 0.06) h), oklch(from var(--background) calc(l * 1.5) calc(c + 0.04) calc(h - 20)))',
        }}
      >
        <span className="font-serif text-base font-bold text-white/95 drop-shadow-lg">
          {t('panel.labelEmpty')}
          <small className="block text-center font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-white/60">
            {t('panel.labelDefault')}
          </small>
        </span>
      </div>
    )
  ) : (
    <div className="relative overflow-hidden rounded-lg border border-border-glass aspect-[16/9]">
      {customBackground ? (
        <img
          src={customBackground}
          alt={t('panel.previewAlt')}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="w-full h-full"
          style={{
            background:
              'radial-gradient(ellipse 50% 45% at 30% 30%, oklch(from var(--primary) l c h / 0.65), transparent 60%), radial-gradient(ellipse 50% 40% at 75% 70%, oklch(from var(--primary) calc(l * 0.54) c calc(h - 75) / 0.75), transparent 60%), linear-gradient(135deg, oklch(from var(--background) calc(l * 2.1) calc(c + 0.06) h), oklch(from var(--background) calc(l * 1.5) calc(c + 0.04) calc(h - 20)))',
          }}
        />
      )}
      <div className="absolute bottom-2.5 left-3 font-serif text-[13px] font-bold text-white drop-shadow">
        {customBackground ? t('panel.labelCustom') : t('panel.labelDefault')}
        <span className="block font-mono text-[9px] font-normal tracking-[0.16em] uppercase text-white/75 mt-0.5">
          {customBackground ? t('panel.labelSet') : t('panel.labelDefaultTag')}
        </span>
      </div>
    </div>
  );

  const actionBar = (
    <div
      className={cn(
        'flex items-center gap-2',
        isOnboarding && 'border-t border-border-glass bg-background/60 p-3'
      )}
    >
      <Button
        variant="outline"
        size="sm"
        className={cn(!isOnboarding && 'border-border-glass', isOnboarding && 'flex-1')}
        onClick={pickBackground}
      >
        <ImageIcon className="w-4 h-4" />
        {t('panel.pickImage')}
      </Button>
      {customBackground && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(!isOnboarding && 'border border-border-glass')}
          onClick={removeBackground}
        >
          <RemoveIconFinal className="w-4 h-4" />
          {removeLabelFinal}
        </Button>
      )}
    </div>
  );

  const sliders =
    showSliders &&
    (isOnboarding ? (
      <div className="flex flex-col gap-2.5">
        <OnboardingSliderRow
          label={t('panel.blur')}
          value={backgroundBlur}
          max={20}
          step={1}
          display={blurDisplay}
          onChange={setBackgroundBlur}
          disabled={slidersDisabled}
        />
        <OnboardingSliderRow
          label={t('panel.opacity')}
          value={backgroundOpacity}
          max={1}
          step={0.01}
          display={`${opacityPct}%`}
          onChange={setBackgroundOpacity}
          disabled={slidersDisabled}
        />
        <OnboardingSliderRow
          label={t('panel.dim')}
          value={backgroundDim}
          max={1}
          step={0.01}
          display={`${dimPct}%`}
          onChange={setBackgroundDim}
          disabled={slidersDisabled}
        />
      </div>
    ) : (
      <div className="space-y-4 pt-1">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label id="bg-opacity-label" className="text-[13px] font-semibold text-foreground">
              {t('panel.opacity')}
            </label>
            <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
              {opacityPct}%
            </span>
          </div>
          <Slider
            aria-labelledby="bg-opacity-label"
            value={[backgroundOpacity]}
            onValueChange={([v]) => setBackgroundOpacity(v)}
            min={0.02}
            max={1}
            step={0.01}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label id="bg-blur-label" className="text-[13px] font-semibold text-foreground">
              {t('panel.blur')}
            </label>
            <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
              {blurDisplay}
            </span>
          </div>
          <Slider
            aria-labelledby="bg-blur-label"
            value={[backgroundBlur]}
            onValueChange={([v]) => setBackgroundBlur(v)}
            min={0}
            max={20}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label id="bg-dim-label" className="text-[13px] font-semibold text-foreground">
              {t('panel.dim')}
            </label>
            <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
              {dimPct}%
            </span>
          </div>
          <Slider
            aria-labelledby="bg-dim-label"
            value={[backgroundDim]}
            onValueChange={([v]) => setBackgroundDim(v)}
            min={0}
            max={1}
            step={0.01}
          />
        </div>
      </div>
    ));

  if (isOnboarding) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <div className="overflow-hidden rounded-2xl border border-border-glass bg-foreground/[0.02]">
          {preview}
          {actionBar}
        </div>
        {sliders}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {preview}
      {actionBar}
      {sliders}
    </div>
  );
}
