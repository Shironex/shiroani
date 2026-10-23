import { Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial } from 'three';

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
  // Past white so it blooms, but low enough to keep its pink.
  moon: new MeshBasicMaterial({ color: hdr('#ffc4e2', 2.4), fog: false }),
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
 * A seated stand-in for Shiro-chan hugging a box set, in her own units (the
 * placement scales her by 1.45). Origin at her root, the seat 0.13 above it.
 */
export function CharacterBlockout() {
  return (
    <group position={[0, 0.13, 0]}>
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

/** The screen itself, origin at its centre. Takes the video later. */
export function BrowserScreenBlockout() {
  return (
    <mesh name="browser_screen" material={mat.screen}>
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
