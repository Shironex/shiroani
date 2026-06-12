/**
 * Generate the Shimeji-style mascot animation sheets from static pose images.
 * Paper-doll technique with proper staging: feet-pivot rotation (no
 * ice-skating), squash & stretch, contact shadows, and alpha-bbox
 * normalization so every pose stands on the same baseline.
 *
 * Inputs  (committed):  resources/mascot/chibi_base.png
 *                       resources/mascot/poses/mascot-{wave,think,sleep}.png
 *           (optional)  resources/mascot/poses/{walk-a,walk-b,stand-side,
 *                       climb,fall,dangle,sleep-lying,excited}.png
 *                       — drop in Recraft-generated poses (any resolution,
 *                       transparent bg) and the matching animations upgrade
 *                       automatically; see docs/research mascot pose pack.
 * Outputs (committed):  resources/mascot/shimeji/<anim>.png   horizontal strips
 *                       resources/mascot/shimeji/manifest.json
 *
 * Run: node scripts/generate-mascot-sprites.mjs
 * sharp is a devDependency — this is a build-time tool, never shipped.
 */

import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RES = join(__dirname, '../resources/mascot');
const POSES = join(RES, 'poses');
const OUT = join(RES, 'shimeji');

const SIZE = 256;
/** Feet baseline: sprites stand 4px above the frame bottom. */
const BASELINE = SIZE - 4;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// ── Pose loading & normalization ─────────────────────────────────────────────

/**
 * Load a pose and normalize it onto a SIZE×SIZE canvas:
 *  1. optionally zero the alpha of a rect (strips baked-in speech bubbles)
 *  2. crop to the alpha bounding box
 *  3. scale so the character is `targetHeight` px tall (preserving ratio)
 *  4. center horizontally, feet on the BASELINE
 * This lets hi-res Recraft art (1024²+) drop in with zero manual framing.
 */
async function loadPose(file, { eraseRect = null, targetHeight = null } = {}) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  if (eraseRect) {
    const { left, top, width: w, height: h } = eraseRect;
    for (let y = top; y < Math.min(top + h, height); y++) {
      for (let x = left; x < Math.min(left + w, width); x++) {
        data[(y * width + x) * 4 + 3] = 0;
      }
    }
  }

  // Alpha bounding box
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`Pose ${file} is fully transparent`);

  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;

  let img = sharp(data, { raw: { width, height, channels: 4 } }).extract({
    left: minX,
    top: minY,
    width: bboxW,
    height: bboxH,
  });

  // Scale: explicit target, else only shrink-to-fit (keeps the four original
  // poses at their authored size so their relative proportions survive).
  let outW = bboxW;
  let outH = bboxH;
  const maxH = BASELINE - 2;
  const desiredH = targetHeight ?? (bboxH > maxH ? maxH : bboxH);
  if (desiredH !== bboxH) {
    outH = desiredH;
    outW = Math.round((bboxW * desiredH) / bboxH);
    if (outW > SIZE - 4) {
      outW = SIZE - 4;
      outH = Math.round((bboxH * outW) / bboxW);
    }
    img = img.resize(outW, outH, { fit: 'fill' });
  }

  const buf = await img.png().toBuffer();
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: TRANSPARENT },
  })
    .composite([
      {
        input: buf,
        left: Math.round((SIZE - outW) / 2),
        top: BASELINE - outH,
      },
    ])
    .png()
    .toBuffer();
}

// ── Frame transforms ─────────────────────────────────────────────────────────

/**
 * Produce one SIZE×SIZE frame from a normalized pose buffer.
 *  - scaleY: vertical squash/stretch, feet-anchored (applied first)
 *  - angle:  rotation in degrees
 *  - pivot:  'feet' rotates around the baseline center (walking rock keeps
 *            feet planted); 'center' tumbles around the middle (falling)
 *  - dx/dy:  pixel offsets (dy < 0 lifts the sprite)
 *  - shadow: draw a soft contact ellipse under the feet, scaled down as the
 *            sprite lifts (dy) so the bounce reads
 */
async function frame(
  poseBuf,
  { angle = 0, dx = 0, dy = 0, scaleY = 1, pivot = 'feet', shadow = false } = {}
) {
  let img = sharp(poseBuf);

  if (scaleY !== 1) {
    const h = Math.round(SIZE * scaleY);
    let squashed = await img.resize(SIZE, h, { fit: 'fill' }).png().toBuffer();
    if (h > SIZE) {
      // Stretch grows upward past the canvas — crop the top overflow so the
      // feet stay anchored.
      squashed = await sharp(squashed)
        .extract({ left: 0, top: h - SIZE, width: SIZE, height: SIZE })
        .png()
        .toBuffer();
    }
    const composed = await sharp({
      create: { width: SIZE, height: SIZE, channels: 4, background: TRANSPARENT },
    })
      .composite([{ input: squashed, left: 0, top: Math.max(0, SIZE - h) }])
      .png()
      .toBuffer();
    img = sharp(composed);
  }

  let body;
  if (angle !== 0) {
    // Pad generously before rotating so the extract window never clips.
    const PAD = 64;
    const padded = await img
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: TRANSPARENT })
      .png()
      .toBuffer();
    const rotated = await sharp(padded).rotate(angle, { background: TRANSPARENT }).png().toBuffer();
    const meta = await sharp(rotated).metadata();

    // Where did the pivot point land after rotation about the canvas center?
    const padSize = SIZE + PAD * 2;
    const c = padSize / 2;
    const pivotY = pivot === 'feet' ? PAD + BASELINE : c;
    const px = PAD + SIZE / 2 - c;
    const py = pivotY - c;
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rpx = meta.width / 2 + (px * cos - py * sin);
    const rpy = meta.height / 2 + (px * sin + py * cos);

    const targetY = pivot === 'feet' ? BASELINE : SIZE / 2;
    const left = Math.round(rpx - SIZE / 2 - dx);
    const top = Math.round(rpy - targetY - dy);
    body = await sharp(rotated)
      .extract({
        left: Math.max(0, Math.min(left, meta.width - SIZE)),
        top: Math.max(0, Math.min(top, meta.height - SIZE)),
        width: SIZE,
        height: SIZE,
      })
      .png()
      .toBuffer();
  } else if (dx !== 0 || dy !== 0) {
    const buf = await img.png().toBuffer();
    body = await sharp({
      create: { width: SIZE, height: SIZE, channels: 4, background: TRANSPARENT },
    })
      .composite([{ input: buf, left: dx, top: dy }])
      .png()
      .toBuffer();
  } else {
    body = await img.png().toBuffer();
  }

  if (!shadow) return body;

  // Contact shadow: a blurred ellipse on the baseline, slightly smaller and
  // fainter the higher the sprite is lifted.
  const lift = Math.min(Math.abs(dy), 12);
  const rx = Math.round(68 * (1 - lift * 0.02));
  const opacity = (0.16 * (1 - lift * 0.03)).toFixed(3);
  const svg = `<svg width="${SIZE}" height="${SIZE}"><ellipse cx="${SIZE / 2}" cy="${BASELINE + 1}" rx="${rx}" ry="6" fill="black" fill-opacity="${opacity}"/></svg>`;
  const shadowLayer = await sharp(Buffer.from(svg)).png().toBuffer();
  const blurred = await sharp(shadowLayer).blur(2.5).png().toBuffer();

  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: TRANSPARENT },
  })
    .composite([
      { input: blurred, left: 0, top: 0 },
      { input: body, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

/** Compose frames into one horizontal strip. */
async function strip(frames) {
  return sharp({
    create: {
      width: SIZE * frames.length,
      height: SIZE,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite(frames.map((input, i) => ({ input, left: i * SIZE, top: 0 })))
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ── Animation definitions ────────────────────────────────────────────────────

/** A 12-step walk cycle: rock ±5°, two bounces per cycle, squash at impact. */
function paperDollWalkFrames() {
  const N = 12;
  const frames = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const angle = 5 * Math.sin(2 * Math.PI * t);
    const bounce = (1 - Math.cos(4 * Math.PI * t)) / 2; // 0 at impact, 1 at top
    frames.push({
      angle,
      dy: Math.round(-3 * bounce),
      scaleY: +(0.982 + 0.028 * bounce).toFixed(3),
      shadow: true,
    });
  }
  return frames;
}

/** Optional hi-res pose file (Recraft pack) or null. */
function optionalPose(name) {
  const p = join(POSES, name);
  return existsSync(p) ? p : null;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  // Recraft pose-pack poses get a consistent character height; the original
  // four keep their authored proportions (sitting poses are naturally shorter).
  const PACK_HEIGHT = 244;
  const pack = async name => {
    const p = optionalPose(name);
    return p ? loadPose(p, { targetHeight: PACK_HEIGHT }) : null;
  };

  const sit = await loadPose(join(RES, 'chibi_base.png'));
  const wave = await loadPose(join(POSES, 'mascot-wave.png'));
  const think = await loadPose(join(POSES, 'mascot-think.png'));
  const sleepSit = await loadPose(join(POSES, 'mascot-sleep.png'));
  // Standing pose without the baked-in "?" bubble — the paper-doll walk base.
  const stand = await loadPose(join(POSES, 'mascot-think.png'), {
    eraseRect: { left: 105, top: 0, width: 50, height: 53 },
  });

  // Optional upgrades (see the pose-pack doc for generation prompts):
  const walkA = await pack('walk-a.png');
  const walkB = await pack('walk-b.png');
  const standSide = await pack('stand-side.png');
  const climbPose = await pack('climb.png');
  const fallPose = await pack('fall.png');
  const danglePose = await pack('dangle.png');
  const sleepLying = await pack('sleep-lying.png');
  const excited = await pack('excited.png');

  const defs = {};

  // walk — real 2-pose gait when walk-a/walk-b exist, else paper-doll rock.
  if (walkA && walkB) {
    const mid = standSide ?? walkA;
    defs.walk = {
      fps: 8,
      loop: true,
      frames: [
        { pose: walkA, dy: 0, scaleY: 0.985, shadow: true },
        { pose: mid, dy: -2, scaleY: 1.005, shadow: true },
        { pose: walkB, dy: 0, scaleY: 0.985, shadow: true },
        { pose: mid, dy: -2, scaleY: 1.005, shadow: true },
      ],
    };
  } else {
    defs.walk = { pose: stand, fps: 14, loop: true, frames: paperDollWalkFrames() };
  }

  // climb — dedicated climbing pose when present (inching up the wall),
  // else the lean-and-creep paper-doll fallback. Authored for the LEFT wall;
  // the renderer mirrors for the right.
  if (climbPose) {
    defs.climb = {
      fps: 8,
      loop: true,
      frames: [
        { pose: climbPose, dy: 0 },
        { pose: climbPose, dy: -4, dx: -2 },
        { pose: climbPose, dy: -8 },
        { pose: climbPose, dy: -4, dx: -2 },
      ],
    };
  } else {
    defs.climb = {
      pose: stand,
      fps: 8,
      loop: true,
      frames: [
        { angle: -10, dy: 0, dx: -4 },
        { angle: -13, dy: -3, dx: -6 },
        { angle: -16, dy: -6, dx: -8 },
        { angle: -13, dy: -8, dx: -6 },
        { angle: -10, dy: -5, dx: -4 },
        { angle: -12, dy: -2, dx: -5 },
      ],
    };
  }

  defs.sit = {
    pose: sit,
    fps: 1,
    loop: true,
    frames: [
      { scaleY: 1, shadow: true },
      { scaleY: 0.99, shadow: true },
    ],
  };

  defs.sleep = {
    pose: sleepLying ?? sleepSit,
    fps: 2,
    loop: true,
    frames: [
      { dy: 0, shadow: true },
      { scaleY: 0.995, shadow: true },
      { scaleY: 0.99, shadow: true },
      { scaleY: 0.995, shadow: true },
    ],
  };

  defs.think = {
    pose: think,
    fps: 2,
    loop: true,
    frames: [
      { dy: 0, shadow: true },
      { dy: -2, shadow: true },
    ],
  };

  defs.wave = {
    pose: excited ?? wave,
    fps: 8,
    loop: true,
    frames: [
      { angle: -2, shadow: true },
      { angle: 0, shadow: true },
      { angle: 2, shadow: true },
      { angle: 0, shadow: true },
    ],
  };

  // Airborne states tumble around the center — no shadow, nothing grounded.
  defs.fall = {
    pose: fallPose ?? wave,
    fps: 12,
    loop: true,
    frames: [
      { angle: -10, pivot: 'center' },
      { angle: 0, pivot: 'center' },
      { angle: 10, pivot: 'center' },
      { angle: 0, pivot: 'center' },
    ],
  };

  defs.dragged = {
    pose: danglePose ?? wave,
    fps: 6,
    loop: true,
    frames: [
      { angle: -6, pivot: 'center' },
      { angle: -2, pivot: 'center' },
      { angle: 2, pivot: 'center' },
      { angle: 6, pivot: 'center' },
    ],
  };

  defs.land = {
    pose: sit,
    fps: 8,
    loop: false,
    frames: [
      { scaleY: 0.82, shadow: true },
      { scaleY: 1.04, shadow: true },
      { scaleY: 0.97, shadow: true },
    ],
  };

  const manifest = { frameSize: SIZE, animations: {} };

  for (const [name, def] of Object.entries(defs)) {
    const frames = [];
    for (const f of def.frames) {
      frames.push(await frame(f.pose ?? def.pose, f));
    }
    const sheet = await strip(frames);
    writeFileSync(join(OUT, `${name}.png`), sheet);
    manifest.animations[name] = {
      file: `${name}.png`,
      frames: def.frames.length,
      fps: def.fps,
      loop: def.loop,
    };
    console.log(`✓ ${name}: ${def.frames.length} frames`);
  }

  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  const packCount = [
    walkA,
    walkB,
    standSide,
    climbPose,
    fallPose,
    danglePose,
    sleepLying,
    excited,
  ].filter(Boolean).length;
  console.log(`✓ manifest.json → ${OUT}`);
  console.log(
    packCount > 0
      ? `✓ pose pack: ${packCount}/8 optional poses found and used`
      : 'ℹ no pose-pack files found — using paper-doll fallbacks (see docs/research mascot pose pack)'
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
