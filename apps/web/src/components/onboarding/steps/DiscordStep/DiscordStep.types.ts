export interface IDiscordStepView {
  readonly enabled: boolean;
  readonly saving: boolean;
  readonly saved: boolean;
  readonly onToggle: (value: boolean) => Promise<void>;
}
