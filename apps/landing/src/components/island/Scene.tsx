import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import {
  BenchBlockout,
  BoxSetBlockout,
  BrowserFrameBlockout,
  BrowserScreenBlockout,
  CharacterBlockout,
  IslandBaseBlockout,
  IsletBlockout,
  LanternPaperBlockout,
  LanternPostBlockout,
  NookBlockout,
  PorchBlockout,
  ShopHouseBlockout,
  ShopSignBlockout,
  ToriiClockBlockout,
  ToriiStaircaseBlockout,
  VendingMachineBlockout,
  ZabutonBlockout,
  mat,
} from './blockouts';
import type { ModelId } from './manifest';
import { Model } from './Model';
import { motion } from './motion';
import { BAKE_LIGHTS, PLACEMENTS, type Placement } from './placements';
import { island } from './progress';
import { ISLAND_STOPS, type Vec3 } from './stops';
import { useCharacterClips } from './useCharacterClips';

// The island layout comes from the Blender export (placements.ts): metres,
// +Y up, the shop front facing +Z, the island top around y = 0 and the porch
// deck at 0.55. Static props draw their baked light; the lights below only
// reach the character and the props placed more than once.

const SKY = '#120d17';
/** Where the moon stop camera looks, far out: the moonlight comes from there. */
const MOON_AT: Vec3 = [16, 70, -55];
/** Large in the sky, like the concepts: about 14 degrees across from the island. */
const MOON_RADIUS = 11;

const moonIndex = ISLAND_STOPS.findIndex(stop => stop.id === 'moon');
const MOON_STOP = moonIndex === -1 ? ISLAND_STOPS.length - 1 : moonIndex;
/** Stops before the moon stop at which she starts waving. */
const WAVE_LEAD = 0.5;

/** The islets bob this far (metres) up and down, at this many radians per second. */
const BOB_AMPLITUDE = 0.25;
const BOB_SPEED = 0.35;

/** Each placed model's stand-in, drawn at the same placement until its GLB is in. */
const BLOCKOUTS = {
  island_base: <IslandBaseBlockout />,
  shop_house: <ShopHouseBlockout />,
  shop_sign: <ShopSignBlockout />,
  porch: <PorchBlockout />,
  vending_machine: <VendingMachineBlockout />,
  torii_staircase: <ToriiStaircaseBlockout />,
  torii_clock: <ToriiClockBlockout />,
  nook: <NookBlockout />,
  browser_frame: <BrowserFrameBlockout />,
  browser_screen: <BrowserScreenBlockout />,
  bench: <BenchBlockout />,
  boxset_stack: <BoxSetBlockout />,
  lantern_post: <LanternPostBlockout />,
  lantern_paper: <LanternPaperBlockout />,
  zabuton: <ZabutonBlockout />,
} satisfies Record<Exclude<ModelId, 'islet' | 'character'>, ReactNode>;

const PLACED = Object.keys(BLOCKOUTS) as (keyof typeof BLOCKOUTS)[];

export function IslandScene() {
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 45, 140]} />
      <Lights />
      <Sky />

      {PLACED.map(id =>
        PLACEMENTS[id].map((at, i) => (
          <Model key={`${id}-${i}`} id={id} {...transform(at)}>
            {BLOCKOUTS[id]}
          </Model>
        ))
      )}
      {PLACEMENTS.islet.map((at, i) => (
        <Islet key={i} at={at} phase={i * 2.1} />
      ))}
      <Character />
    </>
  );
}

function transform({ position, rotation, scale }: Placement) {
  return { position, rotation, scale };
}

/** Warm light under each paper lantern and over the porch rail lanterns. */
const LANTERNS: readonly { at: Vec3; intensity: number; distance: number }[] = [
  { at: BAKE_LIGHTS.lantern_paper, intensity: 3, distance: 4.5 },
  { at: BAKE_LIGHTS.lantern_paper_02, intensity: 3, distance: 4.5 },
  { at: BAKE_LIGHTS.lantern_post_03, intensity: 1.5, distance: 2.5 },
  { at: BAKE_LIGHTS.lantern_paper_nook, intensity: 2.5, distance: 4 },
];

function Lights() {
  return (
    <>
      <ambientLight color="#4a3a66" intensity={0.7} />
      {/* Cool pink-violet moonlight, a rim from behind on the right. */}
      <directionalLight color="#d2a8ff" intensity={1.6} position={[20, 25, -30]} />
      {/* A faint cool fill from the front left so faces are never black. */}
      <directionalLight color="#8c80ff" intensity={0.35} position={[-20, 10, 30]} />
      {LANTERNS.map(({ at, intensity, distance }) => (
        <pointLight
          key={at.join()}
          color="#ffa05c"
          intensity={intensity}
          distance={distance}
          decay={1.6}
          position={at}
        />
      ))}
      {/* The vending machine's pink glow on her side of the bench. */}
      <pointLight
        color="#ff78c0"
        intensity={2}
        distance={2.6}
        decay={1.6}
        position={BAKE_LIGHTS.vending}
      />
    </>
  );
}

function Sky() {
  return (
    <>
      <mesh position={MOON_AT} material={mat.moon}>
        <sphereGeometry args={[MOON_RADIUS, 48, 32]} />
      </mesh>
      <Stars
        radius={120}
        depth={40}
        count={2400}
        factor={4}
        saturation={0}
        fade
        speed={motion.reduced ? 0 : 0.4}
      />
    </>
  );
}

/** Shiro-chan on the bench: seated idle all along, a wave at the moon stop. */
function Character() {
  const onModel = useCharacterClips(() =>
    island.p > MOON_STOP - WAVE_LEAD ? 'wave' : 'seatedIdle'
  );
  return (
    <Model id="character" {...transform(PLACEMENTS.character[0])} onModel={onModel}>
      <CharacterBlockout />
    </Model>
  );
}

function Islet({ at, phase }: { at: Placement; phase: number }) {
  const ref = useRef<Group>(null);
  const y = at.position[1];
  useFrame(() => {
    if (!ref.current || motion.reduced) return;
    ref.current.position.y = y + Math.sin(island.t * BOB_SPEED + phase) * BOB_AMPLITUDE;
  });
  return (
    <group ref={ref} position={at.position}>
      <Model id="islet" rotation={at.rotation} scale={at.scale}>
        <IsletBlockout />
      </Model>
    </group>
  );
}
