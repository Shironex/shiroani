import type { MascotSpriteScaleMode } from '@shiroani/shared';

export type IMascotSectionProps = Record<string, never>;

export interface IVisibilityOption {
  readonly value: string;
  readonly label: string;
}

export interface IScaleModeOption {
  readonly value: MascotSpriteScaleMode;
  readonly label: string;
}

export interface IMascotSectionView {
  readonly enabled: boolean;
  readonly size: number;
  readonly visibilityMode: string;
  readonly positionLocked: boolean;
  readonly animationEnabled: boolean;
  readonly loaded: boolean;
  readonly picking: boolean;
  readonly pickError: string | null;
  readonly customSpriteUrl: string | null;
  readonly scaleMode: MascotSpriteScaleMode;
  readonly minSize: number;
  readonly maxSize: number;
  readonly visibilityOptions: IVisibilityOption[];
  readonly scaleModeOptions: ReadonlyArray<IScaleModeOption>;
  readonly handleToggle: (value: boolean) => Promise<void>;
  readonly handleSizeChange: (values: number[]) => void;
  readonly handleVisibilityModeChange: (mode: string) => Promise<void>;
  readonly handleLockToggle: (value: boolean) => Promise<void>;
  readonly handleAnimationToggle: (value: boolean) => Promise<void>;
  readonly handleResetPosition: () => Promise<void>;
  readonly handlePickSprite: () => Promise<void>;
  readonly handleRemoveSprite: () => Promise<void>;
  readonly handleScaleModeChange: (mode: string) => void;
}
