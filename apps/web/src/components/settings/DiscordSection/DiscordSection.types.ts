import type { Dispatch, SetStateAction } from 'react';
import type {
  DiscordRpcSettings,
  DiscordActivityType,
  DiscordPresenceTemplate,
  DiscordRpcStatus,
} from '@shiroani/shared';

export type IDiscordSectionProps = Record<string, never>;

export interface IDiscordSectionView {
  readonly settings: DiscordRpcSettings | null;
  readonly saved: boolean;
  readonly selectedActivity: DiscordActivityType;
  readonly setSelectedActivity: Dispatch<SetStateAction<DiscordActivityType>>;
  readonly status: DiscordRpcStatus;
  readonly updateField: <K extends keyof DiscordRpcSettings>(
    key: K,
    value: DiscordRpcSettings[K]
  ) => void;
  readonly updateTemplate: (
    type: DiscordActivityType,
    field: string,
    value: string | boolean
  ) => void;
  readonly handleResetTemplate: () => void;
  readonly currentTemplate: DiscordPresenceTemplate;
  readonly previewDetails: string;
  readonly previewState: string;
  readonly showCustomTemplateColumns: boolean;
}
