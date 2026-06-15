import type { ReactNode } from 'react';

export interface IChannelButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export type IChannelButtonView = Record<string, never>;
