import { Color, DoubleSide, MeshStandardMaterial, type Material } from 'three';
import type { Vec3 } from './stops';

// Primitive stand-ins for every island model, sized like the real GLBs. Each
// one is what a <Model> shows while its GLB loads or if it fails, drawn at the
// same placement, so its origin matches the real model's: bottom centre,
// metres, front facing +Z.

/** A colour pushed past white, so bloom picks it up. */
const hdr = (hex: string, k: number) => new Color(hex).multiplyScalar(k);

const standard = (color: string, extra: Partial<MeshStandardMaterial> = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });

const glow = (hex: string, k: number) =>
  new MeshStandardMaterial({ color: '#000000', emissive: hdr(hex, 1), emissiveIntensity: k });

/** One material per surface kind, shared by every blockout (one shader each). */
export const mat = {
  rock: standard('#2b2236', { flatShading: true, roughness: 1 }),
  grass: standard('#26302a', { roughness: 1 }),
  wood: standard('#5b3b2c'),
  woodDark: standard('#35241d'),
  plaster: standard('#cfc2c8'),
  roof: standard('#2a1f33', { roughness: 0.7 }),
  vermilion: standard('#b8423a', { roughness: 0.6 }),
  vending: standard('#efd3e1', { roughness: 0.4 }),
  stone: standard('#6d6676', { roughness: 1 }),
  hair: standard('#f2ecf4', { roughness: 0.6 }),
  sweater: standard('#ee8ab2', { roughness: 0.9 }),
  skin: standard('#f3d9cd', { roughness: 0.7 }),
  boxSet: standard('#8aa4ff', { roughness: 0.5 }),
  bark: standard('#4a3029', { roughness: 0.95 }),
  blossom: standard('#f3a6c8', {
    roughness: 0.9,
    flatShading: true,
    emissive: new Color('#f07ab0'),
    emissiveIntensity: 0.18,
  }),
  leaf: standard('#2f5a34', { roughness: 0.9, flatShading: true }),
  spire: standard('#2a2438', { flatShading: true, roughness: 1 }),
  windowGlow: glow('#ffc78a', 2.2),
  sakuraGlow: glow('#ee8ab2', 2.6),
  lanternGlow: glow('#ffb46e', 3.2),
  clockFace: glow('#fff1e2', 1.4),
  /** The open-air screen's stand-in glow, for when the app capture is not given. */
  screen: new MeshStandardMaterial({
    color: '#000000',
    emissive: hdr('#8f7cf0', 1),
    emissiveIntensity: 1.1,
    side: DoubleSide,
  }),
};

/** The floating rock, origin at its bottom tip, grassy top 10.4 m up. */
export function IslandBaseBlockout() {
  return (
    <group>
      <mesh position={[0, 5.2, 0]} rotation={[Math.PI, 0, 0]} material={mat.rock}>
        <coneGeometry args={[7.6, 10.4, 9]} />
      </mesh>
      <mesh position={[0, 10.35, 0]} material={mat.grass}>
        <cylinderGeometry args={[7.7, 7.6, 0.1, 36]} />
      </mesh>
    </group>
  );
}

/** The two-storey shop-house with its glowing windows. Front wall at z = 2. */
export function ShopHouseBlockout() {
  return (
    <group>
      <mesh position={[0, 2.3, 0]} material={mat.plaster}>
        <boxGeometry args={[5.6, 4.6, 4]} />
      </mesh>
      <mesh position={[0, 5.3, 0]} rotation={[0, Math.PI / 4, 0]} material={mat.roof}>
        <coneGeometry args={[4.4, 1.6, 4]} />
      </mesh>
      <mesh position={[-1.6, 1.6, 2.01]} material={mat.windowGlow}>
        <planeGeometry args={[1.4, 1.3]} />
      </mesh>
      <mesh position={[1.6, 1.6, 2.01]} material={mat.windowGlow}>
        <planeGeometry args={[1.4, 1.3]} />
      </mesh>
    </group>
  );
}

/** The signboard over the shop door, its noren hanging below. */
export function ShopSignBlockout() {
  return (
    <mesh position={[0, 1.15, 0]} material={mat.sakuraGlow}>
      <boxGeometry args={[3, 0.7, 0.1]} />
    </mesh>
  );
}

/** The porch deck in front of the shop and its steps, top at 0.87. */
export function PorchBlockout() {
  return (
    <group>
      <mesh position={[0, 0.8, 0]} material={mat.wood}>
        <boxGeometry args={[6.4, 0.12, 2.2]} />
      </mesh>
      <mesh position={[0, 0.3, 1.25]} material={mat.woodDark}>
        <boxGeometry args={[1.4, 0.6, 0.6]} />
      </mesh>
    </group>
  );
}

/** The porch bench Shiro-chan sits on. Seat top at 0.46. */
export function BenchBlockout() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} material={mat.wood}>
        <boxGeometry args={[1.25, 0.08, 0.44]} />
      </mesh>
      {[-0.55, 0.55].map(x => (
        <mesh key={x} position={[x, 0.19, 0]} material={mat.woodDark}>
          <boxGeometry args={[0.08, 0.38, 0.4]} />
        </mesh>
      ))}
    </group>
  );
}

/** A stack of anime box sets. */
export function BoxSetBlockout() {
  return (
    <mesh position={[0, 0.13, 0]} material={mat.boxSet}>
      <boxGeometry args={[0.36, 0.26, 0.24]} />
    </mesh>
  );
}

/**
 * A seated stand-in for Shiro-chan hugging a box set, in metres. Origin at her
 * root, the seat 0.304 above it; the parts are drawn at 1/1.45 and scaled up.
 */
export function CharacterBlockout() {
  return (
    <group position={[0, 0.304, 0]} scale={1.45}>
      <mesh position={[0, 0.27, 0]} material={mat.sweater}>
        <capsuleGeometry args={[0.13, 0.2, 4, 12]} />
      </mesh>
      <mesh position={[0, 0.6, 0.01]} material={mat.skin}>
        <sphereGeometry args={[0.15, 20, 16]} />
      </mesh>
      <mesh position={[0, 0.62, -0.05]} material={mat.hair}>
        <sphereGeometry args={[0.17, 20, 16]} />
      </mesh>
      {[-0.18, 0.18].map(x => (
        <mesh key={x} position={[x, 0.38, -0.06]} material={mat.hair}>
          <capsuleGeometry args={[0.05, 0.38, 4, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 0.25, 0.17]} material={mat.boxSet}>
        <boxGeometry args={[0.22, 0.2, 0.1]} />
      </mesh>
    </group>
  );
}

/** The glowing vending machine at the end of the porch. */
export function VendingMachineBlockout() {
  return (
    <group>
      <mesh position={[0, 0.87, 0]} material={mat.vending}>
        <boxGeometry args={[1.1, 1.74, 0.8]} />
      </mesh>
      <mesh position={[0, 1.05, 0.41]} material={mat.sakuraGlow}>
        <planeGeometry args={[0.8, 1.0]} />
      </mesh>
    </group>
  );
}

/** A stone lantern on its post, origin on the ground. */
export function LanternPostBlockout() {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} material={mat.stone}>
        <cylinderGeometry args={[0.08, 0.14, 0.5, 8]} />
      </mesh>
      <mesh position={[0, 0.6, 0]} material={mat.lanternGlow}>
        <boxGeometry args={[0.24, 0.22, 0.24]} />
      </mesh>
      <mesh position={[0, 0.8, 0]} material={mat.stone}>
        <coneGeometry args={[0.3, 0.18, 4]} />
      </mesh>
    </group>
  );
}

/** A paper lantern, origin at its hanging point. */
export function LanternPaperBlockout() {
  return (
    <mesh position={[0, -0.25, 0]} material={mat.lanternGlow}>
      <capsuleGeometry args={[0.13, 0.2, 4, 12]} />
    </mesh>
  );
}

/** A floor cushion. */
export function ZabutonBlockout() {
  return (
    <mesh position={[0, 0.07, 0]} material={mat.sweater}>
      <boxGeometry args={[0.6, 0.14, 0.6]} />
    </mesh>
  );
}

/** The lantern nook's deck with its low writing table and the diary on it. */
export function NookBlockout() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} material={mat.wood}>
        <boxGeometry args={[2, 0.32, 2.6]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={mat.woodDark}>
        <boxGeometry args={[1, 0.06, 1]} />
      </mesh>
      <mesh name="diary" position={[0, 0.55, 0]} material={mat.sweater}>
        <boxGeometry args={[0.4, 0.04, 0.3]} />
      </mesh>
    </group>
  );
}

/** The rock plinth with its stairs up to the torii, flat top 2.0 m up. */
export function ToriiStaircaseBlockout() {
  return (
    <mesh position={[0, 1.2, 0]} material={mat.rock}>
      <boxGeometry args={[4.8, 2.4, 5.9]} />
    </mesh>
  );
}

/** The torii gate with the airing clock hung under its crossbar. */
export function ToriiClockBlockout() {
  return (
    <group>
      {[-1.5, 1.5].map(x => (
        <mesh key={x} position={[x, 1.9, 0]} material={mat.vermilion}>
          <cylinderGeometry args={[0.12, 0.14, 3.8, 12]} />
        </mesh>
      ))}
      <mesh position={[0, 3.9, 0]} material={mat.woodDark}>
        <boxGeometry args={[3.8, 0.24, 0.4]} />
      </mesh>
      <mesh position={[0, 3.3, 0]} material={mat.vermilion}>
        <boxGeometry args={[3.2, 0.16, 0.2]} />
      </mesh>
      <mesh
        name="clock_face"
        position={[0, 2.6, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={mat.clockFace}
      >
        <cylinderGeometry args={[0.5, 0.5, 0.08, 32]} />
      </mesh>
    </group>
  );
}

/** The open-air screen's posts and frame, and its viewing deck in front. */
export function BrowserFrameBlockout() {
  return (
    <group>
      {[-1.3, 1.3].map(x => (
        <mesh key={x} position={[x, 1.25, 0]} material={mat.woodDark}>
          <boxGeometry args={[0.14, 2.5, 0.14]} />
        </mesh>
      ))}
      <mesh position={[0, 1.4, -0.06]} material={mat.woodDark}>
        <boxGeometry args={[2.6, 1.5, 0.05]} />
      </mesh>
      <mesh position={[0, 0.1, 1.1]} material={mat.wood}>
        <boxGeometry args={[3, 0.3, 1.8]} />
      </mesh>
    </group>
  );
}

/** The screen itself, origin at its centre, showing `material` (the app capture). */
export function BrowserScreenBlockout({ material = mat.screen }: { material?: Material }) {
  return (
    <mesh name="browser_screen" material={material}>
      <planeGeometry args={[2.4, 1.35]} />
    </mesh>
  );
}

/** A small floating rock with a grassy top, origin at its bottom tip. */
export function IsletBlockout() {
  return (
    <group>
      <mesh position={[0, 1.6, 0]} rotation={[Math.PI, 0, 0]} material={mat.rock}>
        <coneGeometry args={[2, 3.2, 7]} />
      </mesh>
      <mesh position={[0, 3.24, 0]} material={mat.grass}>
        <cylinderGeometry args={[2.05, 2, 0.08, 14]} />
      </mesh>
    </group>
  );
}

/** One canopy blob: [x, y, z, radius]. */
type Blob = readonly [number, number, number, number];

function Canopy({ blobs, material }: { blobs: readonly Blob[]; material: MeshStandardMaterial }) {
  return (
    <>
      {blobs.map(([x, y, z, r]) => (
        <mesh key={`${x},${y},${z}`} position={[x, y, z]} material={material}>
          <icosahedronGeometry args={[r, 1]} />
        </mesh>
      ))}
    </>
  );
}

const LARGE_CANOPY: readonly Blob[] = [
  [-0.6, 5.6, 0, 2.1],
  [1.6, 5.2, 0.6, 1.9],
  [3.6, 4.6, -0.2, 1.6],
  [-2.8, 5, -0.5, 1.6],
  [0.4, 6.6, -0.8, 1.5],
  [-4.6, 4.3, 0.4, 1.1],
];

/**
 * The big sakura by the shop, about 8 m tall and 11 m across. Origin at the
 * middle of its footprint; the trunk stands left of it and the long branch
 * reaches toward +X, over the shop roof.
 */
export function SakuraTreeLargeBlockout() {
  return (
    <group>
      <mesh position={[-1.1, 1.6, 0]} rotation={[0, 0, -0.25]} material={mat.bark}>
        <cylinderGeometry args={[0.28, 0.5, 3.4, 7]} />
      </mesh>
      <mesh position={[0.9, 3.9, 0.2]} rotation={[0, 0, -1.05]} material={mat.bark}>
        <cylinderGeometry args={[0.12, 0.26, 3.6, 6]} />
      </mesh>
      <Canopy blobs={LARGE_CANOPY} material={mat.blossom} />
    </group>
  );
}

const SMALL_CANOPY: readonly Blob[] = [
  [0, 2.35, 0, 0.62],
  [-0.62, 1.75, 0.05, 0.48],
  [0.6, 1.85, -0.05, 0.5],
];

/** A small sakura, about 2.9 m tall: a slim trunk under three round clusters. */
export function SakuraTreeSmallBlockout() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} material={mat.bark}>
        <cylinderGeometry args={[0.07, 0.13, 1.8, 6]} />
      </mesh>
      <Canopy blobs={SMALL_CANOPY} material={mat.blossom} />
    </group>
  );
}

const SHRUB_LEAVES: readonly Blob[] = [
  [0, 0.28, 0, 0.42],
  [-0.45, 0.2, 0.15, 0.32],
  [0.45, 0.22, -0.1, 0.34],
  [0.1, 0.2, 0.42, 0.28],
];
const SHRUB_FLOWERS: readonly Blob[] = [
  [-0.3, 0.5, 0.3, 0.07],
  [0.35, 0.52, 0.2, 0.06],
  [0.05, 0.66, -0.15, 0.07],
];

/** Ferns and pink flowers round a mossy rock, about 1.6 m across. */
export function FlowerShrubsBlockout() {
  return (
    <group>
      <Canopy blobs={SHRUB_LEAVES} material={mat.leaf} />
      <Canopy blobs={SHRUB_FLOWERS} material={mat.sakuraGlow} />
    </group>
  );
}

const SPIRE_WINDOWS: readonly Vec3[] = [
  [0.9, 17.5, 1.6],
  [-1.2, 15.2, 1.3],
  [0.4, 13, 1.95],
  [1.5, 19.6, 0.4],
];

/** A distant rock spire, about 23 m tall, origin at its bottom tip, a few lit windows near the top. */
export function FarSpireBlockout() {
  return (
    <group>
      <mesh position={[0, 11.5, 0]} material={mat.spire}>
        <cylinderGeometry args={[1.4, 0.4, 23, 7]} />
      </mesh>
      <mesh position={[0, 23.6, 0]} material={mat.leaf}>
        <coneGeometry args={[1.6, 1.4, 7]} />
      </mesh>
      {SPIRE_WINDOWS.map(at => (
        <mesh key={at.join()} position={at} material={mat.windowGlow}>
          <boxGeometry args={[0.35, 0.45, 0.35]} />
        </mesh>
      ))}
    </group>
  );
}
