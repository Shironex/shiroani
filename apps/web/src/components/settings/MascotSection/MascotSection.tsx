import { useTranslation } from 'react-i18next';
import { Cat, Image as ImageIcon, Loader2, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  SettingsCard,
  SettingsRow,
  SettingsRowLabel,
  SettingsSectionSkeleton,
  SettingsSelectRow,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { MascotPreview } from '@/components/settings/MascotPreview';
import { useMascotSection } from './MascotSection.hooks';
import type { IMascotSectionProps } from './MascotSection.types';

export default function MascotSection(props: IMascotSectionProps) {
  const { t } = useTranslation('settings');
  const {
    enabled,
    size,
    visibilityMode,
    positionLocked,
    animationEnabled,
    loaded,
    picking,
    pickError,
    customSpriteUrl,
    scaleMode,
    minSize,
    maxSize,
    visibilityOptions,
    scaleModeOptions,
    handleToggle,
    handleSizeChange,
    handleVisibilityModeChange,
    handleLockToggle,
    handleAnimationToggle,
    handleResetPosition,
    handlePickSprite,
    handleRemoveSprite,
    handleScaleModeChange,
  } = useMascotSection(props);

  if (!loaded) return <SettingsSectionSkeleton cards={1} />;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Cat}
        title={t('mascot.card.title')}
        subtitle={t('mascot.card.subtitle')}
        headerAccessory={
          <Switch
            aria-label={t('mascot.card.enableAria')}
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        }
      >
        {enabled && (
          <>
            <MascotPreview current={size} min={minSize} max={maxSize} label={t('previewLabel')} />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">
                  {t('mascot.size')}
                </span>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-primary">
                  {size}px
                </span>
              </div>
              <Slider
                aria-label={t('mascot.sizeAria')}
                value={[size]}
                min={minSize}
                max={maxSize}
                step={8}
                onValueChange={handleSizeChange}
              />
              <div className="mt-1 flex justify-between font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground/80">
                <span>{minSize}px</span>
                <span>{maxSize}px</span>
              </div>
            </div>

            <SettingsRow divider>
              <SettingsRowLabel
                title={t('mascot.sprite.title')}
                description={t('mascot.sprite.description')}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border-glass"
                  onClick={handlePickSprite}
                  disabled={picking}
                >
                  {picking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5" />
                  )}
                  {customSpriteUrl ? t('mascot.sprite.change') : t('mascot.sprite.pick')}
                </Button>
                {customSpriteUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs border border-border-glass"
                    onClick={handleRemoveSprite}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('mascot.sprite.reset')}
                  </Button>
                )}
              </div>
            </SettingsRow>

            {pickError && (
              <p
                role="alert"
                className="text-[11.5px] text-destructive/90 font-medium tracking-[0.01em]"
              >
                {pickError}
              </p>
            )}

            {customSpriteUrl && (
              <SettingsSelectRow
                divider
                title={t('mascot.scaleMode.title')}
                description={t('mascot.scaleMode.description')}
                value={scaleMode}
                onValueChange={handleScaleModeChange}
                options={scaleModeOptions}
                triggerClassName="w-64"
              />
            )}

            <SettingsSelectRow
              divider
              title={t('mascot.visibility.title')}
              description={t('mascot.visibility.description')}
              value={visibilityMode}
              onValueChange={handleVisibilityModeChange}
              options={visibilityOptions}
              triggerClassName="w-56"
            />

            <SettingsToggleRow
              divider
              id="mascot-lock-label"
              title={t('mascot.lock.title')}
              description={t('mascot.lock.description')}
              checked={positionLocked}
              onCheckedChange={handleLockToggle}
            />

            <SettingsToggleRow
              divider
              id="mascot-animation-label"
              title={t('mascot.animation.title')}
              description={t('mascot.animation.description')}
              checked={animationEnabled}
              onCheckedChange={handleAnimationToggle}
            />

            <SettingsRow divider>
              <SettingsRowLabel
                title={t('mascot.resetPosition.title')}
                description={t('mascot.resetPosition.description')}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border-glass"
                onClick={handleResetPosition}
              >
                {t('mascot.resetPosition.action')}
              </Button>
            </SettingsRow>
          </>
        )}
      </SettingsCard>
    </div>
  );
}
