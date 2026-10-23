import { PerformanceMonitor, useProgress } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AgXToneMapping,
  MathUtils,
  PerspectiveCamera,
  Vector3,
  type Mesh,
  type Object3D,
} from 'three';
import { Effects } from './Effects';
import type { ModelId } from './manifest';
import { ModelsContext, settledModels } from './Model';
import { motion } from './motion';
import { island } from './progress';
import { IslandScene } from './Scene';
import { connectIslandScroll, readIslandScroll } from './scroll';
import { ISLAND_STOPS } from './stops';

interface Props {
  models: readonly ModelId[];
  /** Load progress, 0 to 100. */
  onProgress: (percent: number) => void;
  /** Every model and texture is in and a frame has rendered with them. */
  onReady: () => void;
}

const CANVAS_STYLE = { position: 'absolute', inset: 0 } as const;
const GL_OPTIONS = { antialias: false, powerPreference: 'high-performance' } as const;
const FIRST_CAMERA = ISLAND_STOPS[0].camera;
const CAMERA = {
  position: [...FIRST_CAMERA.position] as [number, number, number],
  fov: FIRST_CAMERA.fov,
  near: 0.05,
  far: 220,
};

/** Pixel ratio cap until the frame rate shows the GPU cannot keep up. */
const MAX_DPR = 1.5;
const TONE_EXPOSURE = 1.2;

export default function IslandCanvas({ models, onProgress, onReady }: Props) {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [maxDpr, setMaxDpr] = useState(MAX_DPR);
  const available = useMemo(() => new Set(models), [models]);

  // Stop rendering once the island has scrolled out of view.
  useEffect(() => {
    const el = document.querySelector('[data-island-stage]');
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Canvas
      style={CANVAS_STYLE}
      dpr={[1, maxDpr]}
      frameloop={visible || !ready ? 'always' : 'never'}
      camera={CAMERA}
      // The effect composer multisamples (Effects.tsx), so the default
      // framebuffer would only antialias a second time.
      gl={GL_OPTIONS}
      onCreated={({ gl }) => {
        gl.toneMapping = AgXToneMapping;
        gl.toneMappingExposure = TONE_EXPOSURE;
      }}
    >
      <ModelsContext.Provider value={available}>
        <CameraRig />
        <IslandScene />
        <Effects />
        {!ready && (
          <LoadGate
            models={models}
            onProgress={onProgress}
            onReady={() => {
              setReady(true);
              onReady();
            }}
          />
        )}
        {/* Sampled only once the island is in (loading stalls every frame),
            and one way: a slow GPU drops to 1x once and the monitor goes away,
            so the resolution never flips back and forth. */}
        {ready && maxDpr > 1 && <PerformanceMonitor onDecline={() => setMaxDpr(1)} />}
      </ModelsContext.Provider>
    </Canvas>
  );
}

const pos = new Vector3();
const target = new Vector3();
const look = new Vector3();
const fromVec = new Vector3();
const toVec = new Vector3();
const forward = new Vector3();
const side = new Vector3();
const up = new Vector3();

/** The pointer, -1 to 1 across the window, and its smoothed follower. */
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
/** How far the pointer swings the camera around its target, in radians. */
const PARALLAX = { yaw: 0.04, pitch: 0.025 };
/** Each stop holds the camera still while its section is in this window, blending outside it. */
const HOLD = { from: 0.25, to: 0.75 };
/** The idle sway of the target: radians per second, and its size as a share of the camera distance. */
const DRIFT = { speed: 0.25, amount: 0.03 };
/** Easing rates per second: the pointer follower, and the camera chasing the scroll. */
const POINTER_EASE_RATE = 2.5;
const CAMERA_FOLLOW_RATE = 5;

/** Reads the scroll position each frame and eases the camera toward it. */
function CameraRig() {
  const camera = useThree(state => state.camera) as PerspectiveCamera;
  const started = useRef(false);

  useEffect(() => {
    connectIslandScroll();
    // Desktop only: the stops sit over the canvas, so listen on the window.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = (e.clientY / innerHeight) * 2 - 1;
    };
    addEventListener('pointermove', onMove, { passive: true });
    return () => removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, delta) => {
    island.p = readIslandScroll().progress;
    island.t = state.clock.elapsedTime;
    const reducedMotion = motion.reduced;

    // Hold on each stop for the middle half of its section, blend between.
    const i = Math.min(Math.floor(island.p), ISLAND_STOPS.length - 2);
    const blend = MathUtils.smoothstep(island.p - i, HOLD.from, HOLD.to);
    const from = ISLAND_STOPS[i].camera;
    const to = ISLAND_STOPS[i + 1].camera;

    pos.lerpVectors(fromVec.fromArray(from.position), toVec.fromArray(to.position), blend);
    target.lerpVectors(fromVec.fromArray(from.target), toVec.fromArray(to.target), blend);
    const fov = lockedFov(MathUtils.lerp(from.fov, to.fov, blend), camera.aspect);

    // A slow drift so the island never looks frozen.
    if (!reducedMotion) {
      target.x += Math.sin(island.t * DRIFT.speed) * DRIFT.amount * pos.distanceTo(target);
    }

    // Mouse parallax: a few degrees around the target, eased, never on touch
    // or under reduced motion.
    const parallaxEnabled = motion.finePointer && !reducedMotion;
    const pointerEase = 1 - Math.exp(-delta * POINTER_EASE_RATE);
    pointer.sx += ((parallaxEnabled ? pointer.x : 0) - pointer.sx) * pointerEase;
    pointer.sy += ((parallaxEnabled ? pointer.y : 0) - pointer.sy) * pointerEase;
    const dist = pos.distanceTo(target);
    side.subVectors(target, pos).cross(camera.up).normalize();
    up.crossVectors(side, forward.subVectors(target, pos)).normalize();
    pos.addScaledVector(side, pointer.sx * PARALLAX.yaw * dist);
    pos.addScaledVector(up, -pointer.sy * PARALLAX.pitch * dist);

    // Reduced motion snaps to the scroll instead of gliding after it.
    const follow =
      started.current && !reducedMotion ? 1 - Math.exp(-delta * CAMERA_FOLLOW_RATE) : 1;
    started.current = true;
    camera.position.lerp(pos, follow);
    look.lerp(target, follow);
    camera.lookAt(look);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = MathUtils.lerp(camera.fov, fov, follow);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

/** The aspect the stops are framed at (1440 x 900). */
const FRAME_ASPECT = 1.6;

/**
 * The stops' fov is vertical. On a wider screen, keep the horizontal view of
 * the framing aspect and crop top and bottom instead, so nothing new walks in
 * at the side edges (the copy on the left, Shiro-chan on the right).
 */
function lockedFov(fov: number, aspect: number): number {
  if (aspect <= FRAME_ASPECT) return fov;
  const half = Math.tan(MathUtils.degToRad(fov / 2)) * (FRAME_ASPECT / aspect);
  return MathUtils.radToDeg(2 * Math.atan(half));
}

/**
 * Reports load progress and fires once the island is complete: every model
 * has settled (loaded, or failed and kept its blockout), the loading manager
 * is idle, every material has drawn once, and two frames have rendered since.
 * Until then the canvas stays hidden, so the blockouts never flash in before
 * the models.
 */
function LoadGate({ models, onProgress, onReady }: Props) {
  const { active, progress } = useProgress();
  const shown = useRef(0);
  const frames = useRef(-1);

  useEffect(() => {
    // The manager's total grows as GLBs discover their textures: never step back.
    shown.current = Math.max(shown.current, Math.min(progress, 99));
    onProgress(shown.current);
  }, [progress, onProgress]);

  // The GPU builds each shader on its first draw, tens of milliseconds apiece:
  // drawn all on one frame that blocks the main thread for most of a second.
  // So the island stays hidden while it loads, then shows one material per frame.
  const scene = useThree(state => state.scene);
  const warming = useRef<Object3D[][]>([]);
  useLayoutEffect(() => {
    scene.visible = false;
    return () => {
      scene.visible = true;
    };
  }, [scene]);

  useFrame(() => {
    if (frames.current === -2) {
      const next = warming.current.shift();
      if (next) for (const mesh of next) mesh.visible = true;
      else frames.current = 0;
      return;
    }
    if (frames.current < 0) {
      const settled = models.every(id => settledModels.has(id));
      if (!settled || active) return;
      const byMaterial = new Map<unknown, Object3D[]>();
      scene.traverse(child => {
        const mesh = child as Mesh;
        if (!mesh.isMesh || !mesh.visible) return;
        const key = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        byMaterial.set(key, [...(byMaterial.get(key) ?? []), mesh]);
        mesh.visible = false;
      });
      warming.current = [...byMaterial.values()];
      scene.visible = true;
      frames.current = -2;
      return;
    }
    if (++frames.current === 2) {
      onProgress(100);
      onReady();
    }
  });
  return null;
}
