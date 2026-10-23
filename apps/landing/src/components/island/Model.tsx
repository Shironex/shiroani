import { useAnimations, useGLTF } from '@react-three/drei';
import { useThree, type ThreeElements } from '@react-three/fiber';
import {
  Component,
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
        <Fallback id={id} expected={expected} fallback={children}>
          <Suspense fallback={children}>
            <Glb id={id} expected={expected} onModel={onModel} />
          </Suspense>
        </Fallback>
      ) : (
        children
      )}
    </group>
  );
}

let ktx2: KTX2Loader | null = null;

function ktx2Loader(gl: WebGLRenderer): KTX2Loader {
  // three resolves its own basis transcoder next to the loader (hashed into
  // /_astro by the build), so it always matches this three version.
  ktx2 ??= new KTX2Loader().detectSupport(gl);
  return ktx2;
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
  const gl = useThree(state => state.gl);
  // Meshopt and no Draco, so nothing is fetched from a decoder CDN. drei's
  // GLTFLoader comes from three-stdlib, typed against its own KTX2Loader;
  // three's own loader fits it at runtime.
  const { scene, animations } = useGLTF(modelUrl(id), false, true, loader =>
    loader.setKTX2Loader(ktx2Loader(gl) as unknown as Parameters<typeof loader.setKTX2Loader>[0])
  );
  // SkeletonUtils rebinds a skinned mesh to the copy's own bones, so a model
  // can be placed more than once.
  const copy = useMemo(() => clone(scene), [scene]);
  const { actions } = useAnimations(animations, copy);
  useLayoutEffect(() => onModel?.(copy, actions), [copy, actions, onModel]);
  useLayoutEffect(() => {
    settle(id, expected);
  }, [id, expected]);
  return <primitive object={copy} />;
}

/** Falls back to the blockout when a GLB fails to load or parse. */
class Fallback extends Component<
  { id: ModelId; expected: ReadonlySet<ModelId>; fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    settle(this.props.id, this.props.expected);
    console.warn('[island] model failed, keeping the blockout', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
