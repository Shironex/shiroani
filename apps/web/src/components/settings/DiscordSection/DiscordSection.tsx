import { useTranslation } from 'react-i18next';
import { MessageCircle, Check, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  SettingsCard,
  SettingsInfoCallout,
  SettingsSectionSkeleton,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { DiscordPreview } from '@/components/settings/DiscordPreview';
import { DiscordTemplateEditor } from '@/components/settings/DiscordTemplateEditor';
import { PillTag } from '@/components/ui/pill-tag';
import type { DiscordRpcStatus } from '@shiroani/shared';
import { useDiscordSection } from './DiscordSection.hooks';

/** Map each RPC connection status to a PillTag colour. */
const STATUS_VARIANT: Record<DiscordRpcStatus, 'green' | 'gold' | 'muted' | 'orange'> = {
  connected: 'green',
  connecting: 'gold',
  disconnected: 'muted',
  error: 'orange',
};

export default function DiscordSection() {
  const { t } = useTranslation('settings');
  const {
    settings,
    saved,
    selectedActivity,
    setSelectedActivity,
    status,
    updateField,
    updateTemplate,
    handleResetTemplate,
    currentTemplate,
    previewDetails,
    previewState,
    showCustomTemplateColumns,
  } = useDiscordSection();

  if (!settings) return <SettingsSectionSkeleton cards={1} />;

  const mainCard = (
    <SettingsCard
      icon={MessageCircle}
      title={t('discord.main.title')}
      subtitle={t('discord.main.subtitle')}
      headerAccessory={
        <div className="flex items-center gap-2">
          {settings.enabled && (
            <PillTag
              variant={STATUS_VARIANT[status]}
              aria-label={t('discord.status.aria')}
              // Error is a failure state, not just another accent — force the
              // destructive tint over the mapped variant so it reads as a problem.
              className={cn(status === 'error' && 'bg-destructive/15 text-destructive')}
            >
              {t(`discord.status.${status}`)}
            </PillTag>
          )}
          <Switch
            aria-label={t('discord.main.enableAria')}
            checked={settings.enabled}
            onCheckedChange={v => updateField('enabled', v)}
          />
        </div>
      }
    >
      {!settings.useCustomTemplates && (
        <>
          <SettingsToggleRow
            id="discord-details-label"
            title={t('discord.main.showDetailsTitle')}
            description={t('discord.main.showDetailsDescription')}
            checked={settings.showAnimeDetails}
            onCheckedChange={v => updateField('showAnimeDetails', v)}
            disabled={!settings.enabled}
          />

          <SettingsToggleRow
            divider
            id="discord-time-label"
            title={t('discord.main.showTimeTitle')}
            description={t('discord.main.showTimeDescription')}
            checked={settings.showElapsedTime}
            onCheckedChange={v => updateField('showElapsedTime', v)}
            disabled={!settings.enabled}
          />
        </>
      )}

      <SettingsToggleRow
        divider={!settings.useCustomTemplates}
        id="discord-templates-label"
        title={t('discord.main.useTemplatesTitle')}
        description={t('discord.main.useTemplatesDescription')}
        checked={settings.useCustomTemplates}
        onCheckedChange={v => updateField('useCustomTemplates', v)}
        disabled={!settings.enabled}
      />

      {/* Auto-saved on change — a transient confirmation replaces the old
          explicit Save button so this section matches the rest of settings. */}
      {saved && (
        <div
          role="status"
          className="flex items-center gap-1.5 text-[12px] font-medium text-status-success"
        >
          <Check className="h-3.5 w-3.5" />
          {t('discord.main.saved')}
        </div>
      )}
    </SettingsCard>
  );

  const previewCard = (
    <SettingsCard
      icon={MessageCircle}
      title={t('discord.preview.title')}
      subtitle={t('discord.preview.subtitle')}
      tone="blue"
    >
      <DiscordPreview
        details={previewDetails}
        state={previewState}
        showTimestamp={currentTemplate.showTimestamp}
        showLargeImage={currentTemplate.showLargeImage}
        showButton={currentTemplate.showButton}
        activityType={selectedActivity}
      />
    </SettingsCard>
  );

  const editorCard = (
    <DiscordTemplateEditor
      selectedActivity={selectedActivity}
      onActivityChange={setSelectedActivity}
      currentTemplate={currentTemplate}
      onTemplateChange={updateTemplate}
      onReset={handleResetTemplate}
    />
  );

  const infoCallout = (
    <SettingsInfoCallout
      icon={Info}
      iconClassName="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80"
    >
      {t('discord.info')}
    </SettingsInfoCallout>
  );

  if (showCustomTemplateColumns) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            {mainCard}
            {previewCard}
          </div>
          <div className="space-y-4">{editorCard}</div>
        </div>
        {infoCallout}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mainCard}
      {infoCallout}
    </div>
  );
}
