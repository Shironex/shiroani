import { useFrame } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import { LoopOnce, LoopRepeat, type AnimationAction } from 'three';
import { CHARACTER_CLIPS, type ClipRole } from './manifest';
import { motion } from './motion';
import type { OnModel } from './Model';

/** Seconds a clip takes to blend into the next. */
export const CLIP_FADE = 0.6;
/** Roles that play their clip once and hold its last pose (the wave ends back in the hug). */
const ONCE: ReadonlySet<ClipRole> = new Set(['wave']);

/**
 * Drives the character's skinned clips. `pick` runs every frame and names the
 * role that should play (read the scroll from progress.ts); the hook
 * crossfades whenever the role changes. Pass the returned `onModel` to the
 * character's <Model>: the blockout has no clips, so nothing plays until the
 * real GLB is in. Under reduced motion the clip holds its first pose. A role
 * in ONCE plays through once; the caller picks the next role when it is done.
 */
export function useCharacterClips(pick: () => ClipRole | null): OnModel {
  const actions = useRef<Record<string, AnimationAction | null>>({});
  const current = useRef<AnimationAction | null>(null);
  const missing = useRef(new Set<string>());

  const onModel = useCallback<OnModel>((_model, clips) => {
    actions.current = clips;
    current.current = null;
  }, []);

  useFrame(() => {
    const role = pick();
    const name = role ? CHARACTER_CLIPS[role] : null;
    const next = name ? (actions.current[name] ?? null) : null;
    if (name && !next && !missing.current.has(name) && Object.keys(actions.current).length) {
      missing.current.add(name);
      if (import.meta.env.DEV) console.warn(`[island] character has no clip "${name}"`);
    }
    if (next === current.current) {
      if (next) next.paused = motion.reduced;
      return;
    }
    current.current?.fadeOut(CLIP_FADE);
    if (next && role) {
      const once = ONCE.has(role);
      next.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
      next.clampWhenFinished = once;
    }
    next?.reset().fadeIn(CLIP_FADE).play();
    current.current = next;
  });

  return onModel;
}
