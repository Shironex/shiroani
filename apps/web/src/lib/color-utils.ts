/**
 * Color conversion utilities for theme editor.
 *
 * oklchToHex: parses oklch() string and converts via OKLch → OKLab → XYZ → linear sRGB → sRGB → hex.
 * hexToOklch: converts via hex → sRGB → linear sRGB → XYZ → OKLab → OKLch.
 */

// ─── oklch -> hex (direct math) ─────────────────────────────────────────────

/**
 * Convert an oklch() CSS color string to a hex color (#rrggbb).
 * Parses the oklch values and converts through the color pipeline.
 *
 * Handles formats:
 *   oklch(L C H)
 *   oklch(L C H / A)
 *   oklch(L% C H)
 *   oklch(L% C H / A)
 */
export function oklchToHex(oklchStr: string): string {
  const parsed = parseOklch(oklchStr);
  if (!parsed) return '#000000';

  const { L, C, H } = parsed;

  // OKLch → OKLab
  const hRad = (H * Math.PI) / 180;
  const labA = C * Math.cos(hRad);
  const labB = C * Math.sin(hRad);

  // OKLab → LMS (cube roots) — inverse of M2 matrix
  const l_ = L + 0.3963377774 * labA + 0.2158037573 * labB;
  const m_ = L - 0.1055613458 * labA - 0.0638541728 * labB;
  const s_ = L - 0.0894841775 * labA - 1.291485548 * labB;

  // Cube to undo the cbrt
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS → linear sRGB (inverse of M1 matrix)
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // linear sRGB → sRGB (gamma)
  const r = Math.round(clamp01(linearToSrgb(lr)) * 255);
  const g = Math.round(clamp01(linearToSrgb(lg)) * 255);
  const b = Math.round(clamp01(linearToSrgb(lb)) * 255);

  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ─── hex -> oklch (direct math) ─────────────────────────────────────────────

/**
 * Convert a hex color (#rgb, #rrggbb) to an oklch() CSS string.
 * Returns format: oklch(L C H) matching typical theme CSS values.
 */
export function hexToOklch(hex: string): string {
  const [r, g, b] = hexToRgb(hex);

  // sRGB [0-255] → linear sRGB [0-1]
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  // Linear sRGB → LMS (M1 matrix)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // LMS → OKLab (cbrt + M2 matrix)
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const labL = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const labA = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const labB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // OKLab → OKLch
  const C = Math.sqrt(labA * labA + labB * labB);
  let H = (Math.atan2(labB, labA) * 180) / Math.PI;
  if (H < 0) H += 360;

  const Lfmt = labL.toFixed(2);
  const Cfmt = C.toFixed(4);
  const Hfmt = C < 0.0001 ? '0' : H.toFixed(2);

  return `oklch(${Lfmt} ${Cfmt} ${Hfmt})`;
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Check whether a string is a valid hex color (#rgb, #rrggbb, #rrggbbaa).
 */
export function isValidHexColor(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hex);
}

/**
 * Pick a legible text color (black or white) for text placed on a solid hex
 * background, using the WCAG relative-luminance threshold (~0.179). The result
 * meets AA contrast against that background in any theme, since the chip carries
 * its own background. Used for brand-colored source chips in the feed.
 */
export function readableTextColor(hex: string): '#000000' | '#ffffff' {
  const [r, g, b] = hexToRgb(hex);
  const luminance =
    0.2126 * srgbToLinear(r / 255) +
    0.7152 * srgbToLinear(g / 255) +
    0.0722 * srgbToLinear(b / 255);
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Parse an oklch() CSS string into numeric L, C, H values.
 * L is normalized to [0-1] range (handles both raw and percentage formats).
 */
function parseOklch(str: string): { L: number; C: number; H: number } | null {
  // Match oklch(L C H) or oklch(L C H / A) — L may have % suffix
  const match = str.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
  if (!match) return null;

  let L = parseFloat(match[1]);
  const isPercent = match[2] === '%';
  const C = parseFloat(match[3]);
  const H = parseFloat(match[4]);

  // Normalize L: if percentage, convert to 0-1 range
  if (isPercent) {
    L = L / 100;
  }
  // Some themes use values like 0.55 (already 0-1), others use 55% → 0.55
  // If L > 1 and not percentage, it's likely already a percentage value without %
  if (!isPercent && L > 1) {
    L = L / 100;
  }

  return { L, C, H };
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
