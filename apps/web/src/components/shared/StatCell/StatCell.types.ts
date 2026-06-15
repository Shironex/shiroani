import type * as React from 'react';

/**
 * Redesign primitive: label (JetBrains Mono, small) + value (DM Sans, bold).
 * Used on Profile, Library stats, Diary sidebar.
 */
export interface IStatCellProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  /** Optional descriptor rendered under the value (e.g. "of 184") */
  sub?: React.ReactNode;
  /** When true, displays the value using the Shippori Mincho serif */
  serif?: boolean;
}

export type IStatCellView = Record<string, never>;
