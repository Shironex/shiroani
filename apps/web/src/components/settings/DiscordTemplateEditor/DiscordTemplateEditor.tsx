import { Clock, Image, ExternalLink, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { tDynamic } from '@/lib/i18n';
import type { DiscordActivityType } from '@shiroani/shared';
import {
  DISCORD_ACTIVITY_TYPES,
  DISCORD_ACTIVITY_LABELS,
  DISCORD_TEMPLATE_VARIABLES,
  resolveLocalizedTemplateField,
} from '@shiroani/shared';
import { useDiscordTemplateEditor } from './DiscordTemplateEditor.hooks';
import { TemplateToggle } from './DiscordTemplateEditor.parts';
import type { IDiscordTemplateEditorProps } from './DiscordTemplateEditor.types';

export default function DiscordTemplateEditor(props: IDiscordTemplateEditorProps) {
  const { selectedActivity, onActivityChange, currentTemplate, onTemplateChange, onReset } = props;
  const { t, i18n } = useTranslation('settings');
  useDiscordTemplateEditor();

  // The dropdown labels and variable descriptions ship as `@@i18n:<key>`
  // sentinels in `@shiroani/shared` so they pick up the active UI language
  // here rather than at module-load time. The keys live in the `settings`
  // namespace alongside the rest of the Discord copy.
  const translate = (key: string) => tDynamic(i18n, `settings:${key}`);

  const activityItems = DISCORD_ACTIVITY_TYPES.map(type => (
    <SelectItem key={type} value={type}>
      {resolveLocalizedTemplateField(DISCORD_ACTIVITY_LABELS[type], translate)}
    </SelectItem>
  ));

  const variableChips = DISCORD_TEMPLATE_VARIABLES.map(v => (
    <span key={v.key} className="text-xs text-muted-foreground">
      <code className="text-primary/80 bg-primary/5 px-1 rounded text-2xs">{v.key}</code> ·{' '}
      {resolveLocalizedTemplateField(v.description, translate)}
    </span>
  ));

  return (
    <SettingsCard
      icon={MessageCircle}
      title={t('discord.editor.title')}
      subtitle={t('discord.editor.subtitle')}
    >
      {/* Activity type selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t('discord.editor.activityType')}
        </label>
        <Select
          value={selectedActivity}
          onValueChange={v => onActivityChange(v as DiscordActivityType)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{activityItems}</SelectContent>
        </Select>
      </div>

      <Separator className="bg-border/50" />

      {/* Template inputs */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('discord.editor.line1')}
          </label>
          <Input
            className="h-8 text-sm"
            value={currentTemplate.details}
            onChange={e => onTemplateChange(selectedActivity, 'details', e.target.value)}
            placeholder={t('discord.editor.line1Placeholder')}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('discord.editor.line2')}
          </label>
          <Input
            className="h-8 text-sm"
            value={currentTemplate.state}
            onChange={e => onTemplateChange(selectedActivity, 'state', e.target.value)}
            placeholder={t('discord.editor.line2Placeholder')}
          />
        </div>
      </div>

      {/* Template toggles */}
      <div className="space-y-2">
        <TemplateToggle
          icon={Clock}
          label={t('discord.editor.toggles.duration')}
          checked={currentTemplate.showTimestamp}
          onChange={v => onTemplateChange(selectedActivity, 'showTimestamp', v)}
        />
        <TemplateToggle
          icon={Image}
          label={t('discord.editor.toggles.cover')}
          checked={currentTemplate.showLargeImage}
          onChange={v => onTemplateChange(selectedActivity, 'showLargeImage', v)}
        />
        <TemplateToggle
          icon={ExternalLink}
          label={t('discord.editor.toggles.anilistButton')}
          checked={currentTemplate.showButton}
          onChange={v => onTemplateChange(selectedActivity, 'showButton', v)}
        />
      </div>

      {/* Available variables */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t('discord.editor.variablesLabel')}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">{variableChips}</div>
      </div>

      {/* Reset button */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-xs" onClick={onReset}>
          {t('discord.editor.resetDefaults')}
        </Button>
      </div>
    </SettingsCard>
  );
}
