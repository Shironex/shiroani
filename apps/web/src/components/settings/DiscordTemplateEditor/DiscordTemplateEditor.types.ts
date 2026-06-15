import type { DiscordActivityType, DiscordPresenceTemplate } from '@shiroani/shared';

export interface IDiscordTemplateEditorProps {
  selectedActivity: DiscordActivityType;
  onActivityChange: (activity: DiscordActivityType) => void;
  currentTemplate: DiscordPresenceTemplate;
  onTemplateChange: (type: DiscordActivityType, field: string, value: string | boolean) => void;
  onReset: () => void;
}

export type IDiscordTemplateEditorView = Record<string, never>;
