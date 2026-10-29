import { useFrame } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import {
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Quaternion,
  Vector3,
  type AnimationAction,
  type Object3D,
} from 'three';
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

/** How far her head turns toward the camera at most: sideways, then up or down (degrees). */
const TURN_MAX = { yaw: 40, pitch: 12 } as const;
/** Each bone's share of the turn, from the chest up; they add up to the whole turn. */
const TURN_CHAIN = [
  ['mixamorigSpine2', 0.2],
  ['mixamorigNeck', 0.35],
  ['mixamorigHead', 0.45],
] as const;
/** How fast (per second) the turn eases toward its weight for the stop. */
const TURN_RATE = 2.5;

const UP = new Vector3(0, 1, 0);
const scratch = {
  forward: new Vector3(),
  toCamera: new Vector3(),
  head: new Vector3(),
  aim: new Vector3(),
  turn: new Quaternion(),
  share: new Quaternion(),
  parent: new Quaternion(),
  local: new Quaternion(),
};
const IDENTITY = new Quaternion();

/** A bone the turn moves: its pose before the turn and after it, from the last frame. */
interface Turned {
  bone: Object3D;
  share: number;
  base: Quaternion;
  applied: Quaternion;
}

const turned = (bone: Object3D, share: number): Turned => ({
  bone,
  share,
  base: new Quaternion(),
  applied: new Quaternion(),
});

/**
 * A clip leaves out the bones it holds still (the exporter drops constant
 * channels), so the mixer does not rewrite them every frame. If a bone still
 * has last frame's turn, put its own pose back before turning it again.
 */
function restore(t: Turned) {
  if (t.bone.quaternion.equals(t.applied)) t.bone.quaternion.copy(t.base);
  t.base.copy(t.bone.quaternion);
}

/** Turns `bone` by the world-space rotation `world` about its own joint. */
function turnBone(bone: Object3D, world: Quaternion) {
  const { parent, local } = scratch;
  bone.parent?.getWorldQuaternion(parent);
  local.copy(parent).invert().multiply(world).multiply(parent);
  bone.quaternion.premultiply(local);
  bone.updateMatrixWorld(true);
}

/**
 * Turns her head, and a little of her chest, toward the camera, layered over
 * whatever clip plays. `weight` runs every frame and says how much of the
 * turn the current scroll wants (0 to 1); the turn eases toward it, and holds
 * it without easing under reduced motion. The look is clamped to TURN_MAX
 * around her body's forward, so she never cranks her neck. Runs after the
 * mixer has posed the bones (priority 0.5: after the clips, before the
 * composer renders), so every clip gets it. Pass the returned `onModel` to
 * the character's <Model>.
 */
export function useHeadTurn(weight: () => number): OnModel {
  const rig = useRef<{ root: Object3D; chain: Turned[] } | null>(null);
  const eased = useRef(0);

  const onModel = useCallback<OnModel>(model => {
    const chain = TURN_CHAIN.flatMap(([name, share]) => {
      const bone = model.getObjectByName(name);
      return bone ? [turned(bone, share)] : [];
    });
    rig.current = chain.length === TURN_CHAIN.length ? { root: model, chain } : null;
  }, []);

  useFrame(({ camera }, delta) => {
    const want = weight();
    eased.current = motion.reduced
      ? want
      : eased.current + (want - eased.current) * (1 - Math.exp(-delta * TURN_RATE));
    const k = eased.current;
    if (!rig.current) return;
    const { root, chain } = rig.current;
    for (const t of chain) restore(t);
    if (k < 1e-3) {
      for (const t of chain) t.applied.set(NaN, NaN, NaN, NaN);
      return;
    }
    const { forward, toCamera, head, aim, turn, share } = scratch;

    // Her body's forward on the ground, and the clamped direction toward the camera.
    root.getWorldQuaternion(share);
    forward.set(0, 0, 1).applyQuaternion(share).setY(0).normalize();
    chain[chain.length - 1].bone.getWorldPosition(head);
    toCamera.copy(camera.position).sub(head).normalize();
    const flat = aim.copy(toCamera).setY(0).normalize();
    const side = Math.sign(forward.x * flat.z - forward.z * flat.x) || 1;
    const yaw = Math.min(forward.angleTo(flat), MathUtils.degToRad(TURN_MAX.yaw)) * -side;
    const limit = MathUtils.degToRad(TURN_MAX.pitch);
    const pitch = MathUtils.clamp(Math.asin(MathUtils.clamp(toCamera.y, -1, 1)), -limit, limit);
    aim
      .copy(forward)
      .applyAxisAngle(UP, yaw)
      .multiplyScalar(Math.cos(pitch))
      .addScaledVector(UP, Math.sin(pitch));
    turn.setFromUnitVectors(forward, aim).slerp(IDENTITY, 1 - k);

    for (const t of chain) {
      turnBone(t.bone, share.copy(IDENTITY).slerp(turn, t.share));
      t.applied.copy(t.bone.quaternion);
    }
  }, 0.5);

  return onModel;
}
