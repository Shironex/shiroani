import type { NotificationSubscription } from '@shiroani/shared';

export type INotificationsSectionProps = Record<string, never>;

export interface INotifFormData {
  enabled: boolean;
  leadTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  useSystemSound: boolean;
}

export interface ILeadTimeOption {
  readonly value: string;
  readonly label: string;
}

export interface INotificationsSectionView {
  readonly data: INotifFormData;
  readonly loaded: boolean;
  readonly updateAndSave: (partial: Partial<INotifFormData>) => void;
  readonly subscriptions: NotificationSubscription[];
  readonly unsubscribe: (anilistId: number) => Promise<void>;
  readonly toggleSubscription: (anilistId: number) => Promise<void>;
  readonly leadTimeOptions: ILeadTimeOption[];
}
