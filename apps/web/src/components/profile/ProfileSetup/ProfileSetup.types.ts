import type { Dispatch, FormEvent, SetStateAction } from 'react';

export type IProfileSetupProps = Record<string, never>;

export interface IProfileSetupView {
  readonly input: string;
  readonly setInput: Dispatch<SetStateAction<string>>;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly handleSubmit: (e: FormEvent) => void;
}
