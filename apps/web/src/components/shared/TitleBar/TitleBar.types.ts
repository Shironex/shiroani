export type ITitleBarProps = Record<string, never>;

export interface ITitleBarView {
  readonly isMaximized: boolean;
  readonly handleMinimize: () => void;
  readonly handleMaximize: () => void;
  readonly handleClose: () => void;
}
