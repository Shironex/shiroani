import { useAnimations, useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import {
  createContext,
  Suspense,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { AnimationAction, Object3D, WebGLRenderer } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { applyBakedLight } from './baked';
import { ErrorBoundary } from './ErrorBoundary';
import { modelUrl, type ModelId } from './manifest';

/** Model ids with a real file under /island/models. Filled by the page. */
export const ModelsContext = createContext<ReadonlySet<ModelId>>(new Set());

/**
 * Model ids that are in the scene or have failed (and kept their blockout).
 * The loader holds the island back until every model has settled.
 */
export const settledModels = new Set<ModelId>();

/**
 * Marks a model as settled. Once every model that has a file has, the KTX2
 * loader (and its transcoder workers) is no longer needed.
 */
function settle(id: ModelId, expected: ReadonlySet<ModelId>) {
  settledModels.add(id);
  if (ktx2 && [...expected].every(model => settledModels.has(model))) {
    ktx2.dispose();
    ktx2 = null;
  }
}

/** Called once the GLB is in the scene, with its copy and its clips by name. */
export type OnModel = (model: Object3D, actions: Record<string, AnimationAction | null>) => void;

type ModelProps = Omit<ThreeElements['group'], 'id'> & {
  id: ModelId;
  /** The blockout, shown while there is no GLB, while it loads, or if it fails. */
  children: ReactNode;
  onModel?: OnModel;
};

/**
 * One model of the island. Renders /island/models/<id>.glb when that file
 * exists, otherwise the blockout passed as children. Animations look their
 * parts up by node name, so blockouts and GLBs must use the same names.
 */
export function Model({ id, children, onModel, ...group }: ModelProps) {
  const expected = useContext(ModelsContext);
  const hasModel = expected.has(id);
  return (
    <group name={id} {...group}>
      {hasModel ? (
        // A GLB that fails to load or parse keeps the blockout.
        <ErrorBoundary
          fallback={children}
          onError={error => {
            settle(id, expected);
            console.warn('[island] model failed, keeping the blockout', error);
          }}
        >
          <Suspense fallback={children}>
            <Glb id={id} expected={expected} onModel={onModel} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        children
      )}
    </group>
  );
}

let ktx2: KTX2Loader | null = null;

let setRenderer: (gl: WebGLRenderer) => void = () => {};
const renderer = new Promise<WebGLRenderer>(resolve => (setRenderer = resolve));

/** Hands the canvas's renderer to the KTX2 loader. Called once the canvas has one. */
export function provideRenderer(gl: WebGLRenderer) {
  setRenderer(gl);
}

/**
 * KTX2 needs the renderer to pick a texture format, but the models start
 * loading before the canvas exists. So a texture waits for the renderer here.
 */
class DeferredKTX2Loader extends KTX2Loader {
  private detected = false;

  load(...args: Parameters<KTX2Loader['load']>) {
    void renderer.then(gl => {
      if (!this.detected) {
        this.detectSupport(gl);
        this.detected = true;
      }
      super.load(...args);
    });
  }
}

// three resolves its own basis transcoder next to the loader (hashed into
// /_astro by the build), so it always matches this three version.
const ktx2Loader = () => (ktx2 ??= new DeferredKTX2Loader());

// Meshopt and no Draco, so nothing is fetched from a decoder CDN. drei's
// GLTFLoader comes from three-stdlib, typed against its own KTX2Loader;
// three's own loader fits it at runtime.
type GltfLoader = Parameters<NonNullable<Parameters<typeof useGLTF>[3]>>[0];
const withKtx2 = (loader: GltfLoader) =>
  loader.setKTX2Loader(ktx2Loader() as unknown as Parameters<GltfLoader['setKTX2Loader']>[0]);

/** Starts fetching the models that have files, before the canvas mounts. */
export function preloadModels(ids: readonly ModelId[]) {
  for (const id of ids) useGLTF.preload(modelUrl(id), false, true, withKtx2);
}

function Glb({
  id,
  expected,
  onModel,
}: {
  id: ModelId;
  expected: ReadonlySet<ModelId>;
  onModel?: OnModel;
}) {
  const { scene, animations } = useGLTF(modelUrl(id), false, true, withKtx2);
  // SkeletonUtils rebinds a skinned mesh to the copy's own bones, so a model
  // can be placed more than once.
  const copy = useMemo(() => clone(scene), [scene]);
  // Static props carry their night light baked: draw them unlit with it.
  useLayoutEffect(() => applyBakedLight(copy), [copy]);
  const { actions } = useAnimations(animations, copy);
  useLayoutEffect(() => onModel?.(copy, actions), [copy, actions, onModel]);
  useLayoutEffect(() => {
    settle(id, expected);
  }, [id, expected]);
  return <primitive object={copy} />;
}
