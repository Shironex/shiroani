import { useCallback, useEffect, useRef, useState } from 'react';
import type { IDiscordStepView } from './DiscordStep.types';

/**
 * Loads the current Discord RPC settings from the main-process electron-store,
 * mirrors the `enabled` flag in local state, and persists toggles back over IPC.
 * Degrades silently when `window.electronAPI` is missing (web/dev preview).
 */
export function useDiscordStep(): IDiscordStepView {
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the "saved" reset timer if the step unmounts before it fires.
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    window.electronAPI?.discordRpc
      ?.getSettings()
      .then((s: { enabled?: boolean } | null) => {
        if (s && typeof s.enabled === 'boolean') setEnabled(s.enabled);
      })
      .catch(() => {
        // Electron API unavailable — degrade silently
      });
  }, []);

  const onToggle = useCallback(async (value: boolean) => {
    setEnabled(value);
    setSaving(true);
    try {
      const current = await window.electronAPI?.discordRpc?.getSettings();
      if (current) {
        await window.electronAPI?.discordRpc?.updateSettings({ ...current, enabled: value });
      }
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    } catch {
      // Electron API unavailable or failed — degrade silently
    } finally {
      setSaving(false);
    }
  }, []);

  return { enabled, saving, saved, onToggle };
}
