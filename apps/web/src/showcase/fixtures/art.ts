/**
 * Procedural, license-free artwork for the showcase fixtures: every cover,
 * avatar and site icon is an SVG data URI generated from a seed, so no real
 * key art, profile picture or brand mark ever reaches a screenshot.
 */

export interface IPalette {
  from: string;
  to: string;
  accent: string;
}

export const PALETTES: IPalette[] = [
  { from: '#b0547e', to: '#2a1236', accent: '#ffd9e6' },
  { from: '#3f7fb0', to: '#101c3d', accent: '#d8f0ff' },
  { from: '#c07a3a', to: '#4a1426', accent: '#ffe8c4' },
  { from: '#3f8f6a', to: '#0f2a2c', accent: '#dbffe8' },
  { from: '#6f5bc0', to: '#161236', accent: '#e8e2ff' },
  { from: '#c0604a', to: '#3a0f22', accent: '#ffe0d6' },
  { from: '#3d8f9a', to: '#0f2630', accent: '#dcf8fb' },
  { from: '#9b4fa0', to: '#22102f', accent: '#fbe0f7' },
];

function svgUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function paletteFor(seed: number): IPalette {
  return PALETTES[seed % PALETTES.length];
}

/** A 2:3 poster: gradient sky, a sun or moon, layered hills and a few stars. */
export function coverArt(seed: number): string {
  const p = paletteFor(seed);
  const orbX = 60 + ((seed * 37) % 120);
  const orbY = 70 + ((seed * 23) % 70);
  const orbR = 26 + ((seed * 11) % 22);
  const hillA = 190 + ((seed * 17) % 40);
  const hillB = 220 + ((seed * 29) % 30);
  const stars = Array.from({ length: 6 }, (_, i) => {
    const x = (seed * 53 + i * 71) % 230;
    const y = (seed * 31 + i * 43) % 120;
    return `<circle cx="${x + 5}" cy="${y + 8}" r="${1 + (i % 2)}" fill="${p.accent}" opacity="0.8"/>`;
  }).join('');
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${p.to}"/><stop offset="0.6" stop-color="${p.from}"/>` +
      `<stop offset="1" stop-color="${p.to}"/>` +
      `</linearGradient></defs>` +
      `<rect width="240" height="360" fill="url(#g)"/>` +
      stars +
      `<circle cx="${orbX}" cy="${orbY}" r="${orbR}" fill="${p.accent}" opacity="0.9"/>` +
      `<path d="M0 ${hillA} Q60 ${hillA - 50} 120 ${hillA} T240 ${hillA - 10} V360 H0Z" fill="${p.to}" opacity="0.55"/>` +
      `<path d="M0 ${hillB} Q80 ${hillB - 40} 150 ${hillB + 10} T240 ${hillB} V360 H0Z" fill="${p.to}" opacity="0.85"/>` +
      `<rect y="300" width="240" height="60" fill="${p.to}"/>` +
      `</svg>`
  );
}

/** A wide banner in the same style as {@link coverArt}. */
export function bannerArt(seed: number): string {
  const p = paletteFor(seed);
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 240">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${p.from}"/><stop offset="1" stop-color="${p.to}"/>` +
      `</linearGradient></defs>` +
      `<rect width="960" height="240" fill="url(#g)"/>` +
      `<circle cx="760" cy="80" r="46" fill="${p.accent}" opacity="0.85"/>` +
      `<path d="M0 170 Q240 110 480 170 T960 150 V240 H0Z" fill="${p.to}" opacity="0.7"/>` +
      `</svg>`
  );
}

/** A round avatar: gradient disc with one initial. */
export function avatarArt(seed: number, initial: string): string {
  const p = paletteFor(seed);
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${p.from}"/><stop offset="1" stop-color="${p.to}"/>` +
      `</linearGradient></defs>` +
      `<rect width="128" height="128" fill="url(#g)"/>` +
      `<text x="64" y="82" text-anchor="middle" font-family="Georgia, serif" font-size="56" fill="${p.accent}">${initial}</text>` +
      `</svg>`
  );
}

/** A small rounded-square site icon with one letter. */
export function iconArt(seed: number, letter: string): string {
  const p = paletteFor(seed);
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="14" fill="${p.to}"/>` +
      `<text x="32" y="43" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="30" fill="${p.from}">${letter}</text>` +
      `</svg>`
  );
}
