import { useEffect, useMemo } from 'react';
import { DirectionalLight, ShadowMaterial, type Object3D } from 'three';
import { PLACEMENTS } from './placements';

// Shiro-chan's contact shadow on the bench and the deck. One small shadow map
// that only she (and the box sets she hugs) casts into: a soft light straight
// down from the eave lanterns, its frustum hugging the bench, so the map stays
// sharp at 512 px and the shadow pass draws her alone. The bench is lit in
// real time and takes the shadow itself; the deck's light is baked, so a
// shadow-only quad lies on it.

const AT = PLACEMENTS.character[0].position;
/** The porch deck's top (the Blender build's plinth top). */
const DECK_Y = 0.5498;
/** Half the shadow frustum's width, metres. */
const REACH = 0.95;
const MAP_SIZE = 512;

/** Marks every mesh under `root` as casting or receiving the contact shadow. */
export function castsShadow(root: Object3D) {
  root.traverse(child => {
    child.castShadow = true;
  });
}

export function receivesShadow(root: Object3D) {
  root.traverse(child => {
    child.receiveShadow = true;
  });
}

const deckMaterial = new ShadowMaterial({ color: '#1a0c1e', opacity: 0.5 });

export function ContactShadow() {
  const light = useMemo(() => {
    const l = new DirectionalLight('#ffb27a', 0.35);
    l.position.set(AT[0] + 0.35, AT[1] + 3, AT[2] + 0.9);
    l.target.position.set(AT[0], AT[1], AT[2]);
    l.castShadow = true;
    const camera = l.shadow.camera;
    camera.left = camera.bottom = -REACH;
    camera.right = camera.top = REACH;
    camera.near = 1.5;
    camera.far = 4.5;
    l.shadow.mapSize.set(MAP_SIZE, MAP_SIZE);
    l.shadow.radius = 5;
    l.shadow.bias = -0.0005;
    l.shadow.normalBias = 0.01;
    return l;
  }, []);
  useEffect(() => () => light.dispose(), [light]);
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
      <mesh
        position={[AT[0] + 0.2, DECK_Y + 0.004, AT[2] + 0.35]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={deckMaterial}
        receiveShadow
      >
        <planeGeometry args={[REACH * 2.4, REACH * 2.4]} />
      </mesh>
    </>
  );
}
