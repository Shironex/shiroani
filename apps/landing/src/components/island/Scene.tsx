import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import {
  BenchBlockout,
  BrowserScreenBlockout,
  CharacterBlockout,
  IslandBaseBlockout,
  IsletBlockout,
  LanternsBlockout,
  ShopHouseBlockout,
  ToriiClockBlockout,
  VendingMachineBlockout,
  mat,
} from './blockouts';
import type { ModelId } from './manifest';
import { Model } from './Model';
import { motion } from './motion';
import { island } from './progress';
import { ISLAND_STOPS, type Vec3 } from './stops';
import { useCharacterClips } from './useCharacterClips';

// The island layout. Metres; the shop front is at z = -1.1, the porch runs
// out to z = 0.7 and the island top sits at y = 0. [PLACEHOLDER LAYOUT]
// Positions follow the blockouts; move them to match the real GLBs.

const SKY = '#120d17';
const SHOP_AT: Vec3 = [0, 0, -2.6];
const BENCH_AT: Vec3 = [0.9, 0.2, -0.75];
/** Her seat on the bench, a little left of its middle. */
const CHARACTER_AT: Vec3 = [0.75, 0.66, -0.72];
const VENDING_AT: Vec3 = [2.95, 0.2, -0.75];
const TORII_AT: Vec3 = [-4.6, 0, 1.6];
const SCREEN_AT: Vec3 = [3.9, 0, 1.4];
const MOON_AT: Vec3 = [18, 30, -66];

const moonIndex = ISLAND_STOPS.findIndex(stop => stop.id === 'moon');
const MOON_STOP = moonIndex === -1 ? ISLAND_STOPS.length - 1 : moonIndex;
/** Stops before the moon stop at which she starts waving. */
const WAVE_LEAD = 0.5;

/** The islets bob this far (metres) up and down, at this many radians per second. */
const BOB_AMPLITUDE = 0.25;
const BOB_SPEED = 0.35;

/** The three islets drifting around the main island, and how they bob. */
const ISLETS: readonly {
  id: Extract<ModelId, `islet_${string}`>;
  at: Vec3;
  scale: number;
  phase: number;
}[] = [
  { id: 'islet_a', at: [-12, -1.5, -9], scale: 1.4, phase: 0 },
  { id: 'islet_b', at: [11, 1.5, -12], scale: 1.1, phase: 2.1 },
  { id: 'islet_c', at: [9, -3, 8], scale: 0.8, phase: 4.2 },
];

export function IslandScene() {
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 30, 110]} />
      <Lights />
      <Sky />

      <Model id="island_base">
        <IslandBaseBlockout />
      </Model>
      <Model id="shop_house" position={SHOP_AT}>
        <ShopHouseBlockout />
      </Model>
      <Model id="bench" position={BENCH_AT}>
        <BenchBlockout />
      </Model>
      <Character />
      <Model id="vending_machine" position={VENDING_AT} rotation={[0, -0.25, 0]}>
        <VendingMachineBlockout />
      </Model>
      <Model id="lanterns">
        <LanternsBlockout />
      </Model>
      <Model id="torii_clock" position={TORII_AT} rotation={[0, 0.35, 0]}>
        <ToriiClockBlockout />
      </Model>
      <Model id="browser_screen" position={SCREEN_AT} rotation={[0, -0.55, 0]}>
        <BrowserScreenBlockout />
      </Model>
      {ISLETS.map(islet => (
        <Islet key={islet.id} {...islet} />
      ))}
    </>
  );
}

function Lights() {
  return (
    <>
      <ambientLight color="#5a4778" intensity={0.9} />
      {/* Cool pink moonlight from the moon's side. */}
      <directionalLight color="#c9a6e8" intensity={1.4} position={[MOON_AT[0], MOON_AT[1], 10]} />
      {/* Warm lantern light pooling on the porch and in the nook. */}
      <pointLight color="#ffb46e" intensity={6} distance={6} position={[0.2, 2.4, 0.3]} />
      <pointLight color="#ffb46e" intensity={4} distance={4} position={[-3.8, 1.2, -2.2]} />
    </>
  );
}

function Sky() {
  return (
    <>
      <mesh position={MOON_AT} material={mat.moon}>
        <sphereGeometry args={[6, 48, 32]} />
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
    <Model id="character" position={CHARACTER_AT} rotation={[0, -0.15, 0]} onModel={onModel}>
      <CharacterBlockout />
    </Model>
  );
}

function Islet({ id, at, scale, phase }: (typeof ISLETS)[number]) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current || motion.reduced) return;
    ref.current.position.y = at[1] + Math.sin(island.t * BOB_SPEED + phase) * BOB_AMPLITUDE;
  });
  return (
    <group ref={ref} position={at} scale={scale}>
      <Model id={id}>
        <IsletBlockout />
      </Model>
    </group>
  );
}
