import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';
import type {
  IMascotSectionProps,
  IMascotSectionView,
  IScaleModeOption,
} from './MascotSection.types';

const MASCOT_MIN_SIZE = 48;
const MASCOT_MAX_SIZE = 256;

export function useMascotSection(_props?: IMascotSectionProps): IMascotSectionView {
  const { t } = useTranslation('settings');
  const [enabled, setEnabled] = useState(true);
  const [size, setSize] = useState(128);
  const [visibilityMode, setVisibilityMode] = useState('always');
  const [positionLocked, setPositionLocked] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const customSpriteUrl = useMascotSpriteStore(s => s.customSpriteUrl);
  const scaleMode = useMascotSpriteStore(s => s.scaleMode);
  const pickSprite = useMascotSpriteStore(s => s.pickSprite);
  const removeSprite = useMascotSpriteStore(s => s.removeSprite);
  const setScaleMode = useMascotSpriteStore(s => s.setScaleMode);

  const visibilityOptions = [
    { value: 'always', label: t('mascot.visibility.options.always') },
    { value: 'tray-only', label: t('mascot.visibility.options.trayOnly') },
  ];

  const scaleModeOptions: ReadonlyArray<IScaleModeOption> = [
    { value: 'contain', label: t('mascot.scaleMode.options.contain') },
    { value: 'cover', label: t('mascot.scaleMode.options.cover') },
    { value: 'stretch', label: t('mascot.scaleMode.options.stretch') },
  ];

  useEffect(() => {
    const api = window.electronAPI?.overlay;
    if (!api) return;

    Promise.all([
      api.isEnabled(),
      api.getSize(),
      api.getVisibilityMode(),
      api.isPositionLocked(),
      api.isAnimationEnabled(),
    ])
      .then(([en, sz, mode, locked, anim]) => {
        setEnabled(en);
        setSize(sz);
        setVisibilityMode(mode);
        setPositionLocked(locked);
        setAnimationEnabled(anim);
      })
      .catch(() => {
        // Fall back to defaults — still mark loaded so the section renders
        // instead of staying blank forever.
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleToggle = async (value: boolean) => {
    setEnabled(value);
    await window.electronAPI?.overlay?.setEnabled(value);
  };

  const handleSizeChange = (values: number[]) => {
    const newSize = values[0];
    setSize(newSize);

    // Debounce the actual resize to avoid spamming the native addon
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      window.electronAPI?.overlay?.setSize(newSize);
    }, 150);
  };

  const handleVisibilityModeChange = async (mode: string) => {
    setVisibilityMode(mode);
    await window.electronAPI?.overlay?.setVisibilityMode(mode);
  };

  const handleLockToggle = async (value: boolean) => {
    setPositionLocked(value);
    await window.electronAPI?.overlay?.setPositionLocked(value);
  };

  const handleAnimationToggle = async (value: boolean) => {
    setAnimationEnabled(value);
    await window.electronAPI?.overlay?.setAnimationEnabled(value);
  };

  const handleResetPosition = async () => {
    await window.electronAPI?.overlay?.resetPosition();
  };

  const handlePickSprite = async () => {
    setPickError(null);
    setPicking(true);
    try {
      await pickSprite();
    } catch (err) {
      // pickSprite re-throws on validation/IO errors so the user sees a
      // concrete reason (file too big, wrong format, etc.) instead of a
      // silent no-op. The string comes from the main process and is
      // already user-facing copy.
      const message = err instanceof Error ? err.message : t('mascot.sprite.errorFallback');
      setPickError(message);
    } finally {
      setPicking(false);
    }
  };

  const handleRemoveSprite = async () => {
    setPickError(null);
    await removeSprite();
  };

  const handleScaleModeChange = (mode: string) => {
    if (mode === 'contain' || mode === 'cover' || mode === 'stretch') {
      void setScaleMode(mode);
    }
  };

  return {
    enabled,
    size,
    visibilityMode,
    positionLocked,
    animationEnabled,
    loaded,
    picking,
    pickError,
    customSpriteUrl,
    scaleMode,
    minSize: MASCOT_MIN_SIZE,
    maxSize: MASCOT_MAX_SIZE,
    visibilityOptions,
    scaleModeOptions,
    handleToggle,
    handleSizeChange,
    handleVisibilityModeChange,
    handleLockToggle,
    handleAnimationToggle,
    handleResetPosition,
    handlePickSprite,
    handleRemoveSprite,
    handleScaleModeChange,
  };
}
