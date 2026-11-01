import { useFrame } from '@react-three/fiber';
import { useCallback, useRef, type ReactNode } from 'react';
import {
  Color,
  MeshStandardMaterial,
  type Group,
  type Mesh,
  type Object3D,
  type PointLight,
} from 'three';
import {
  BenchBlockout,
  BoxSetBlockout,
  BrowserFrameBlockout,
  BrowserScreenBlockout,
  CharacterBlockout,
  FarSpireBlockout,
  FlowerShrubsBlockout,
  IslandBaseBlockout,
  IsletBlockout,
  LanternPaperBlockout,
  LanternPostBlockout,
  NookBlockout,
  PorchBlockout,
  SakuraTreeLargeBlockout,
  SakuraTreeSmallBlockout,
  ShopHouseBlockout,
  ShopSignBlockout,
  ToriiClockBlockout,
  ToriiStaircaseBlockout,
  VendingMachineBlockout,
  ZabutonBlockout,
} from './blockouts';
import { Clouds } from './Clouds';
import { castsShadow, ContactShadow, receivesShadow } from './ContactShadow';
import { CHARACTER_CLIPS, type ModelId } from './manifest';
import { Model, type OnModel } from './Model';
import { motion } from './motion';
import { Petals } from './Petals';
import { BAKE_LIGHTS, PLACEMENTS, type Placement } from './placements';
import { island, near } from './progress';
import { screenMaterial } from './screen';
import { ShopBoard } from './ShopBoard';
import { MOON_AT, Sky } from './Sky';
import { ISLAND_STOPS, type StopId, type Vec3 } from './stops';
import { CLIP_FADE, useCharacterClips, useHeadTurn } from './useCharacterClips';
import { Waterfalls } from './Waterfalls';

// The island layout comes from the Blender export (placements.ts): metres,
// +Y up, the shop front facing +Z, the island top around y = 0 and the porch
// deck at 0.55. Static props draw their baked light; the lights below only
// reach the character and the props placed more than once.

const SKY = '#120d17';
/** The haze: the sky's horizon violet, so far things sink into it. */
const HAZE = '#24173a';
const HAZE_RANGE = [38, 175] as const;

const moonIndex = ISLAND_STOPS.findIndex(stop => stop.id === 'moon');
const MOON_STOP = moonIndex === -1 ? ISLAND_STOPS.length - 1 : moonIndex;
/** Stops before the moon stop at which she starts waving. */
const WAVE_LEAD = 0.5;
/** Seconds of hugging between two waves while the moon stop stays on screen. */
const WAVE_REST = 6;

/**
 * How much she turns her head toward the camera at each stop she is seen at:
 * the library looks at her from the side, the porch and moon stops from a
 * little off her front.
 */
const HEAD_TURN: Partial<Record<StopId, number>> = { porch: 0.7, library: 1, moon: 0.5 };
const HEAD_TURN_AT = ISLAND_STOPS.flatMap((stop, k) =>
  HEAD_TURN[stop.id] ? [[k, HEAD_TURN[stop.id] ?? 0] as const] : []
);

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
  browser_screen: <BrowserScreenBlockout material={screenMaterial()} />,
  bench: <BenchBlockout />,
  boxset_stack: <BoxSetBlockout />,
  lantern_post: <LanternPostBlockout />,
  lantern_paper: <LanternPaperBlockout />,
  zabuton: <ZabutonBlockout />,
  sakura_tree_large: <SakuraTreeLargeBlockout />,
  sakura_tree_small: <SakuraTreeSmallBlockout />,
  flower_shrubs: <FlowerShrubsBlockout />,
  far_spire: <FarSpireBlockout />,
} satisfies Record<Exclude<ModelId, 'islet' | 'character'>, ReactNode>;

const PLACED = Object.keys(BLOCKOUTS) as (keyof typeof BLOCKOUTS)[];

/** The live-lit Tripo materials the scene adjusts once a GLB is in. */
const meshMaterials = (root: Object3D) => {
  const out = new Set<MeshStandardMaterial>();
  root.traverse(child => {
    const material = (child as Mesh).material;
    if (material instanceof MeshStandardMaterial) out.add(material);
  });
  return out;
};

/** Sakura and shrubs glow a little from within, like the concepts' blossoms at night. */
const blossomGlow: OnModel = model => {
  for (const material of meshMaterials(model)) {
    if (material.userData.glow) continue;
    material.userData.glow = true;
    material.emissive = new Color('#ffffff');
    material.emissiveMap = material.map;
    material.emissiveIntensity = 0.2;
  }
};

/** How brightly the sakura's blossoms catch the light along their edges. */
const SAKURA_RIM = 0.9;

/**
 * The sakura glow like the shrubs, and their blossoms light up toward their
 * outline, as petals do against the moon: the clumps' edges read as soft
 * backlit blossom instead of the cut polygon outline of the Tripo mesh. Only
 * pink texels catch it, so the trunks stay dark.
 */
const sakuraGlow: OnModel = (model, actions) => {
  blossomGlow(model, actions);
  for (const material of meshMaterials(model)) {
    if (material.userData.rim) continue;
    material.userData.rim = true;
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          float pink = smoothstep(0.08, 0.25, diffuseColor.r - diffuseColor.g);
          float edge = 1.0 - saturate(abs(dot(normal, normalize(vViewPosition))));
          totalEmissiveRadiance += diffuseColor.rgb * pink * pow(edge, 2.5) * ${SAKURA_RIM.toFixed(2)};
        }`
      );
    };
    material.needsUpdate = true;
  }
};

/**
 * The far spires' windows: the warm texels of the spire's texture are lit
 * from within, the rest stays dark rock.
 */
const spireWindows: OnModel = model => {
  for (const material of meshMaterials(model)) {
    if (material.userData.glow) continue;
    material.userData.glow = true;
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          vec3 albedo = diffuseColor.rgb;
          float warm = smoothstep(0.08, 0.2, albedo.r - albedo.b) * smoothstep(0.2, 0.45, albedo.r);
          totalEmissiveRadiance += vec3(1.0, 0.62, 0.3) * warm * 6.0;
        }`
      );
    };
    material.needsUpdate = true;
  }
};

const ON_MODEL: Partial<Record<ModelId, OnModel>> = {
  sakura_tree_large: sakuraGlow,
  sakura_tree_small: sakuraGlow,
  flower_shrubs: blossomGlow,
  far_spire: spireWindows,
  bench: receivesShadow,
  boxset_stack: model => {
    castsShadow(model);
    receivesShadow(model);
  },
  browser_screen: model => {
    model.traverse(child => {
      if ((child as Mesh).isMesh) (child as Mesh).material = screenMaterial();
    });
  },
};

export function IslandScene() {
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[HAZE, ...HAZE_RANGE]} />
      <Lights />
      <Sky />
      <Clouds />

      {PLACED.map(id =>
        PLACEMENTS[id].map((at, i) => (
          <Model key={`${id}-${i}`} id={id} {...transform(at)} onModel={ON_MODEL[id]}>
            {BLOCKOUTS[id]}
          </Model>
        ))
      )}
      {PLACEMENTS.islet.map((at, i) => (
        <Islet key={i} at={at} phase={i * 2.1} />
      ))}
      <ShopBoard />
      <Waterfalls />
      <Petals />
      <Character />
      <ContactShadow />
    </>
  );
}

function transform({ position, rotation, scale }: Placement) {
  return { position, rotation, scale };
}

/** Warm light under each paper lantern and over the porch rail lanterns. */
const LANTERNS: readonly { at: Vec3; intensity: number; distance: number }[] = [
  { at: BAKE_LIGHTS.lantern_paper, intensity: 4, distance: 5 },
  { at: BAKE_LIGHTS.lantern_paper_02, intensity: 4, distance: 5 },
  { at: BAKE_LIGHTS.lantern_post_03, intensity: 2, distance: 2.8 },
  { at: BAKE_LIGHTS.lantern_paper_nook, intensity: 3.2, distance: 4.5 },
];

/** At the moon stop the lanterns burn this much brighter, so their gold reaches her. */
const MOON_LANTERN_BOOST = 1.2;

function Lights() {
  const lanterns = useRef<(PointLight | null)[]>([]);
  useFrame(() => {
    const boost = 1 + MOON_LANTERN_BOOST * near(MOON_STOP);
    LANTERNS.forEach(({ intensity }, i) => {
      const light = lanterns.current[i];
      if (light) light.intensity = intensity * boost;
    });
  });
  return (
    <>
      <ambientLight color="#57406e" intensity={0.75} />
      {/* Pink moonlight from the moon itself, a rim from behind on the right. */}
      <directionalLight color="#f0a8e8" intensity={1.7} position={MOON_AT} />
      {/* A faint cool fill from the front left so faces are never black. */}
      <directionalLight color="#8c80ff" intensity={0.35} position={[-20, 10, 30]} />
      {LANTERNS.map(({ at, intensity, distance }, i) => (
        <pointLight
          key={at.join()}
          ref={light => {
            lanterns.current[i] = light;
          }}
          color="#ff9a52"
          intensity={intensity}
          distance={distance}
          decay={1.6}
          position={at}
        />
      ))}
      {/* The vending machine's pink glow on her side of the bench, kept low so the timber stays warm. */}
      <pointLight
        color="#ff78c0"
        intensity={1.3}
        distance={2.4}
        decay={1.6}
        position={BAKE_LIGHTS.vending}
      />
    </>
  );
}

/**
 * Shiro-chan on the bench: seated idle all along. At the moon stop she waves
 * (a few calm waves, then back to the hug), and again after a rest while the
 * stop stays on screen. Where the camera sees her from off her front, she
 * turns her head toward it.
 */
function Character() {
  const wave = useRef({ start: -Infinity, length: 0 });
  const onClips = useCharacterClips(() => {
    const w = wave.current;
    if (island.p <= MOON_STOP - WAVE_LEAD || !w.length) {
      w.start = -Infinity;
      return 'seatedIdle';
    }
    const since = island.t - w.start;
    if (since > w.length + WAVE_REST) {
      w.start = island.t;
      return 'wave';
    }
    return since < w.length - CLIP_FADE ? 'wave' : 'seatedIdle';
  });
  const onTurn = useHeadTurn(() =>
    HEAD_TURN_AT.reduce((sum, [k, amount]) => sum + amount * near(k), 0)
  );
  const onModel = useCallback<OnModel>(
    (model, actions) => {
      castsShadow(model);
      wave.current.length = actions[CHARACTER_CLIPS.wave]?.getClip().duration ?? 0;
      onClips(model, actions);
      onTurn(model, actions);
    },
    [onClips, onTurn]
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
