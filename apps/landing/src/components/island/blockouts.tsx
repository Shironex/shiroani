import { Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { Vec3 } from './stops';

// [PLACEHOLDER GEOMETRY] Primitive stand-ins for every island model, sized
// roughly like the concepts. Each one is the fallback a <Model> shows until
// its GLB lands, so keep their origins where the real models' will be: bottom
// centre, metres, front facing +Z.

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
  windowGlow: glow('#ffc78a', 2.2),
  sakuraGlow: glow('#ee8ab2', 2.6),
  lanternGlow: glow('#ffb46e', 3.2),
  clockFace: glow('#fff1e2', 1.4),
  /** The open-air screen. Takes a video texture as `map` once the capture exists. */
  screen: new MeshStandardMaterial({
    color: '#000000',
    emissive: hdr('#8f7cf0', 1),
    emissiveIntensity: 1.1,
    side: DoubleSide,
  }),
  moon: new MeshBasicMaterial({ color: hdr('#ffd8ea', 3), fog: false }),
};

/** The floating rock and its grassy top, top surface at y = 0. */
export function IslandBaseBlockout() {
  return (
    <group>
      <mesh position={[0, -2.6, 0]} material={mat.rock}>
        <cylinderGeometry args={[7.6, 1.4, 5.2, 9]} />
      </mesh>
      <mesh position={[0, -0.05, 0]} material={mat.grass}>
        <cylinderGeometry args={[7.7, 7.6, 0.1, 36]} />
      </mesh>
    </group>
  );
}

/** The shop-house with its glowing windows and sign, and the porch deck in front. */
export function ShopHouseBlockout() {
  return (
    <group>
      {/* Body: front wall at z = 1.5 in this group. */}
      <mesh position={[0, 1.5, 0]} material={mat.plaster}>
        <boxGeometry args={[4.2, 3, 3]} />
      </mesh>
      <mesh position={[0, 3.1, 0.15]} material={mat.roof}>
        <boxGeometry args={[4.9, 0.22, 3.7]} />
      </mesh>
      <mesh position={[0, 3.75, 0]} rotation={[0, Math.PI / 4, 0]} material={mat.roof}>
        <coneGeometry args={[3, 1.1, 4]} />
      </mesh>
      {/* Shop windows, the library stop. */}
      <mesh name="shop_window_left" position={[-1.25, 1.35, 1.51]} material={mat.windowGlow}>
        <planeGeometry args={[1.2, 1.3]} />
      </mesh>
      <mesh name="shop_window_right" position={[1.45, 1.6, 1.51]} material={mat.windowGlow}>
        <planeGeometry args={[0.9, 0.8]} />
      </mesh>
      <mesh name="door" position={[0.2, 1.05, 1.51]} material={mat.woodDark}>
        <planeGeometry args={[0.9, 2.1]} />
      </mesh>
      <mesh name="sign" position={[0, 2.55, 1.56]} material={mat.sakuraGlow}>
        <boxGeometry args={[2, 0.42, 0.06]} />
      </mesh>
      {/* Porch deck and its posts, from the wall out to z = 3.3 in this group. */}
      <mesh position={[0, 0.1, 2.4]} material={mat.wood}>
        <boxGeometry args={[4.8, 0.2, 1.8]} />
      </mesh>
      {[-2.25, 2.25].map(x => (
        <mesh key={x} position={[x, 1.5, 3.2]} material={mat.woodDark}>
          <boxGeometry args={[0.14, 2.8, 0.14]} />
        </mesh>
      ))}
    </group>
  );
}

/** The porch bench Shiro-chan sits on. Seat top at y = 0.46. */
export function BenchBlockout() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} material={mat.wood}>
        <boxGeometry args={[1.5, 0.08, 0.46]} />
      </mesh>
      <mesh position={[0, 0.72, -0.21]} material={mat.wood}>
        <boxGeometry args={[1.5, 0.42, 0.05]} />
      </mesh>
      {[-0.65, 0.65].map(x => (
        <mesh key={x} position={[x, 0.19, 0]} material={mat.woodDark}>
          <boxGeometry args={[0.08, 0.38, 0.4]} />
        </mesh>
      ))}
    </group>
  );
}

/** A seated stand-in for Shiro-chan hugging a box set, origin at the seat. */
export function CharacterBlockout() {
  return (
    <group>
      <mesh position={[0, 0.27, 0]} material={mat.sweater}>
        <capsuleGeometry args={[0.15, 0.24, 4, 12]} />
      </mesh>
      <mesh position={[0, 0.64, 0.01]} material={mat.skin}>
        <sphereGeometry args={[0.16, 20, 16]} />
      </mesh>
      <mesh position={[0, 0.66, -0.05]} material={mat.hair}>
        <sphereGeometry args={[0.185, 20, 16]} />
      </mesh>
      {/* Twin tails. */}
      {[-0.2, 0.2].map(x => (
        <mesh key={x} position={[x, 0.42, -0.06]} material={mat.hair}>
          <capsuleGeometry args={[0.06, 0.42, 4, 8]} />
        </mesh>
      ))}
      {/* Knees drawn up, the box set held against them. */}
      <mesh position={[0, 0.12, 0.2]} rotation={[0.5, 0, 0]} material={mat.skin}>
        <boxGeometry args={[0.24, 0.12, 0.34]} />
      </mesh>
      <mesh name="box_set" position={[0, 0.28, 0.2]} rotation={[-0.15, 0, 0]} material={mat.boxSet}>
        <boxGeometry args={[0.26, 0.3, 0.08]} />
      </mesh>
    </group>
  );
}

/** The glowing vending machine at the end of the porch. */
export function VendingMachineBlockout() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} material={mat.vending}>
        <boxGeometry args={[0.85, 1.8, 0.7]} />
      </mesh>
      <mesh name="vending_front" position={[0, 1.1, 0.351]} material={mat.sakuraGlow}>
        <planeGeometry args={[0.66, 1.05]} />
      </mesh>
    </group>
  );
}

/** A paper lantern, origin at its hanging point. */
function PaperLantern({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.25, 0]} material={mat.lanternGlow}>
        <capsuleGeometry args={[0.13, 0.16, 4, 12]} />
      </mesh>
    </group>
  );
}

/** A stone garden lantern, origin on the ground. */
function StoneLantern({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} material={mat.stone}>
        <cylinderGeometry args={[0.08, 0.14, 0.7, 8]} />
      </mesh>
      <mesh position={[0, 0.82, 0]} material={mat.lanternGlow}>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
      </mesh>
      <mesh position={[0, 1.02, 0]} material={mat.stone}>
        <coneGeometry args={[0.24, 0.2, 4]} />
      </mesh>
    </group>
  );
}

/** The lantern nook's writing table, island coordinates (the diary stop). */
const NOOK_AT: Vec3 = [-3.8, 0.18, -2.3];

/**
 * Every lantern on the island in one model: two paper lanterns under the
 * porch eave and the lantern nook to the left of the shop (the diary stop),
 * with its low writing table. Positions are island coordinates.
 */
export function LanternsBlockout() {
  return (
    <group>
      <PaperLantern position={[-1.7, 2.95, 0.55]} />
      <PaperLantern position={[2.0, 2.95, 0.55]} />
      <PaperLantern position={[-3.4, 2.1, -1.6]} />
      <StoneLantern position={[-4.6, 0, -2.6]} />
      <StoneLantern position={[-3.0, 0, -3.2]} />
      <mesh name="nook_table" position={NOOK_AT} material={mat.woodDark}>
        <boxGeometry args={[0.9, 0.06, 0.55]} />
      </mesh>
      <mesh
        name="diary"
        position={[NOOK_AT[0], NOOK_AT[1] + 0.05, NOOK_AT[2]]}
        rotation={[0, 0.3, 0]}
        material={mat.sweater}
      >
        <boxGeometry args={[0.28, 0.04, 0.2]} />
      </mesh>
    </group>
  );
}

/** The torii gate with the airing clock hung under its crossbar. */
export function ToriiClockBlockout() {
  return (
    <group>
      {[-1.05, 1.05].map(x => (
        <mesh key={x} position={[x, 1.4, 0]} material={mat.vermilion}>
          <cylinderGeometry args={[0.1, 0.12, 2.8, 12]} />
        </mesh>
      ))}
      <mesh position={[0, 2.9, 0]} material={mat.woodDark}>
        <boxGeometry args={[3, 0.18, 0.32]} />
      </mesh>
      <mesh position={[0, 2.75, 0]} material={mat.vermilion}>
        <boxGeometry args={[2.8, 0.14, 0.26]} />
      </mesh>
      <mesh position={[0, 2.35, 0]} material={mat.vermilion}>
        <boxGeometry args={[2.4, 0.12, 0.16]} />
      </mesh>
      <mesh
        name="clock_face"
        position={[0, 1.95, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={mat.clockFace}
      >
        <cylinderGeometry args={[0.36, 0.36, 0.06, 32]} />
      </mesh>
    </group>
  );
}

/** The open-air screen on its two posts. The `screen` mesh takes the video later. */
export function BrowserScreenBlockout() {
  return (
    <group>
      {[-1.15, 1.15].map(x => (
        <mesh key={x} position={[x, 1.05, -0.06]} material={mat.woodDark}>
          <boxGeometry args={[0.1, 2.1, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, 1.65, -0.05]} material={mat.woodDark}>
        <boxGeometry args={[2.5, 1.5, 0.06]} />
      </mesh>
      <mesh name="screen" position={[0, 1.65, -0.015]} material={mat.screen}>
        <planeGeometry args={[2.3, 1.3]} />
      </mesh>
    </group>
  );
}

/** A small floating rock with a grassy top. `scale` sizes the whole islet. */
export function IsletBlockout() {
  return (
    <group>
      <mesh position={[0, -1.1, 0]} rotation={[Math.PI, 0, 0]} material={mat.rock}>
        <coneGeometry args={[1.4, 2.2, 7]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} material={mat.grass}>
        <cylinderGeometry args={[1.45, 1.4, 0.08, 14]} />
      </mesh>
    </group>
  );
}
