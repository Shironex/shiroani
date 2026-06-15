import { useCallback, useState, type FormEvent } from 'react';
import { useProfileStore } from '@/stores/useProfileStore';
import type { IProfileSetupView } from './ProfileSetup.types';

export function useProfileSetup(): IProfileSetupView {
  const [input, setInput] = useState('');
  const setUsername = useProfileStore(s => s.setUsername);
  const isLoading = useProfileStore(s => s.isLoading);
  const error = useProfileStore(s => s.error);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (input.trim()) setUsername(input.trim());
    },
    [input, setUsername]
  );

  return { input, setInput, isLoading, error, handleSubmit };
}
