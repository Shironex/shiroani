import { PerformanceMonitor, useProgress } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AgXToneMapping,
  MathUtils,
  PerspectiveCamera,
  Vector3,
  type Material,
  type Mesh,
  type Object3D,
} from 'three';
import { Effects } from './Effects';
import type { ModelId, ModelUrls } from './manifest';
import { ModelsContext, provideRenderer, settledModels } from './Model';
import { motion } from './motion';
import { CAMERA_FOLLOW_RATE, island, segment } from './progress';
import { IslandScene } from './Scene';
import { connectIslandScroll, readIslandScroll } from './scroll';
import { ISLAND_STOPS } from './stops';

export { preloadModels } from './Model';

interface Props {
  models: ModelUrls;
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

/**
 * What the island renders at, best first. Each time the frame rate shows the
 * GPU cannot keep up it takes the next step: the pixel ratio drops to 1, then
 * the composer stops multisampling.
 */
const QUALITY_STEPS = [
  { maxDpr: 1.5, multisampling: 4 },
  { maxDpr: 1, multisampling: 4 },
  { maxDpr: 1, multisampling: 0 },
] as const;
const LOWEST_QUALITY = QUALITY_STEPS.length - 1;
const TONE_EXPOSURE = 1.2;

export default function IslandCanvas({ models, onProgress, onReady }: Props) {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const quality = QUALITY_STEPS[step];
  const available = useMemo(() => new Map(Object.entries(models) as [ModelId, string][]), [models]);

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
      dpr={[1, quality.maxDpr]}
      frameloop={visible || !ready ? 'always' : 'never'}
      camera={CAMERA}
      // One small shadow map, for Shiro-chan's contact shadow (ContactShadow.tsx).
      shadows="percentage"
      // The effect composer multisamples (Effects.tsx), so the default
      // framebuffer would only antialias a second time.
      gl={GL_OPTIONS}
      onCreated={({ gl }) => {
        gl.toneMapping = AgXToneMapping;
        gl.toneMappingExposure = TONE_EXPOSURE;
        provideRenderer(gl);
      }}
    >
      <ModelsContext.Provider value={available}>
        <CameraRig />
        <IslandScene />
        <Effects multisampling={quality.multisampling} />
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
            and one way: a slow GPU steps down and never back up, so the image
            never flips back and forth. A fresh monitor judges each step, and
            it goes away at the lowest one. */}
        {ready && step < LOWEST_QUALITY && (
          <PerformanceMonitor key={step} onDecline={() => setStep(step + 1)} />
        )}
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
/** The idle sway of the target: radians per second, and its size as a share of the camera distance. */
const DRIFT = { speed: 0.25, amount: 0.03 };
/** Easing rate per second of the pointer follower. */
const POINTER_EASE_RATE = 2.5;

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
    if (!reducedMotion) island.flow += delta;

    // Hold on each stop for the middle half of its section, blend between.
    const { i, blend } = segment(island.p, ISLAND_STOPS.length);
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
 * Where the load gate is: waiting for every model to settle, warming one
 * material per frame, then settling for a few frames with everything drawn.
 */
type LoadPhase = 'waiting' | 'warming' | 'settling';

/** Frames rendered with every material in before the island counts as ready. */
const FRAMES_AFTER_WARM_UP = 2;

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
  const phase = useRef<LoadPhase>('waiting');
  const settlingFrames = useRef(0);

  useEffect(() => {
    // The manager's total grows as GLBs discover their textures: never step back.
    shown.current = Math.max(shown.current, Math.min(progress, 99));
    onProgress(shown.current);
  }, [progress, onProgress]);

  // The GPU builds each shader on its first draw, tens of milliseconds apiece:
  // drawn all on one frame that blocks the main thread for most of a second.
  // So the island stays hidden while it loads, then shows one material per frame.
  const scene = useThree(state => state.scene);
  const warming = useRef<Mesh[][]>([]);
  useLayoutEffect(() => {
    scene.visible = false;
    return () => {
      scene.visible = true;
    };
  }, [scene]);

  useFrame(() => {
    switch (phase.current) {
      case 'waiting': {
        const settled = (Object.keys(models) as ModelId[]).every(id => settledModels.has(id));
        if (!settled || active) return;
        warming.current = groupMeshesByMaterial(scene);
        for (const group of warming.current) for (const mesh of group) mesh.visible = false;
        scene.visible = true;
        phase.current = 'warming';
        return;
      }
      case 'warming': {
        const next = warming.current.shift();
        if (next) for (const mesh of next) mesh.visible = true;
        else phase.current = 'settling';
        return;
      }
      case 'settling':
        if (++settlingFrames.current === FRAMES_AFTER_WARM_UP) {
          onProgress(100);
          onReady();
        }
    }
  });
  return null;
}

/** The visible meshes under `root`, grouped by their (first) material. */
function groupMeshesByMaterial(root: Object3D): Mesh[][] {
  const groups = new Map<Material, Mesh[]>();
  root.traverse(child => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const key = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const group = groups.get(key);
    if (group) group.push(mesh);
    else groups.set(key, [mesh]);
  });
  return [...groups.values()];
}
