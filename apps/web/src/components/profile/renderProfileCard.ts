import type { UserProfile } from '@shiroani/shared';

const WIDTH = 800;
const HEIGHT = 420;

// ── Palette ──────────────────────────────────────────────────────

const BG = '#0c0c12';
const BG_BAR = '#1a1a28';
const TEXT = '#e8e8f0';
const TEXT_DIM = '#9494aa';
const TEXT_FAINT = '#55556a';
const DIVIDER = '#1e1e2e';
const BRAND = '#e85d8a'; // Spy×Family pink — matches the mascot/app theme

const BAR_PALETTE = ['#7c5bf5', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'];

const SCORE_COLORS: Record<number, string> = {
  10: '#ef4444',
  20: '#ef4444',
  30: '#f97316',
  40: '#f59e0b',
  50: '#eab308',
  60: '#84cc16',
  70: '#22c55e',
  80: '#10b981',
  90: '#06b6d4',
  100: '#3b82f6',
};

const STATUS_PALETTE: Record<string, string> = {
  CURRENT: '#22c55e',
  COMPLETED: '#3b82f6',
  PLANNING: '#06b6d4',
  DROPPED: '#ef4444',
  PAUSED: '#f59e0b',
  REPEATING: '#8b5cf6',
};

// ── Helpers ──────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement | null> {
  const fetchViaIpc = window.electronAPI?.app?.fetchImageBase64;
  const fetchFn = fetchViaIpc
    ? (u: string) => fetchViaIpc(u)
    : (u: string) =>
        fetch(u)
          .then(r => (r.ok ? r.blob() : null))
          .then(b => (b ? URL.createObjectURL(b) : null))
          .catch(() => null);

  return fetchFn(url).then(dataUrl => {
    if (!dataUrl) return null;
    return new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  });
}

/** Load a local asset (same-origin, no IPC needed). */
function loadLocalImage(path: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = path;
  });
}

function drawTruncated(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
) {
  let t = text;
  while (ctx.measureText(t).width > maxWidth && t.length > 0) {
    t = t.slice(0, -1);
  }
  if (t.length < text.length && t.length > 0) t = t.slice(0, -1) + '\u2026';
  ctx.fillText(t, x, y);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function formatDays(minutes: number): string {
  const days = minutes / 60 / 24;
  return days >= 1 ? `${days.toFixed(1)}` : `${(minutes / 60).toFixed(1)}`;
}

function formatDaysUnit(minutes: number): string {
  return minutes / 60 / 24 >= 1 ? 'dni' : 'godz';
}

function formatNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const FONT = '"DM Sans", system-ui, sans-serif';

// ── Corner accent strokes ────────────────────────────────────────

function drawCornerAccents(ctx: CanvasRenderingContext2D) {
  const len = 50;
  const offset = 6;

  // Top-left corner — pink gradient stroke
  const tlGrad = ctx.createLinearGradient(offset, offset, offset + len, offset + len);
  tlGrad.addColorStop(0, 'rgba(232, 93, 138, 0.7)');
  tlGrad.addColorStop(1, 'rgba(232, 93, 138, 0)');

  ctx.strokeStyle = tlGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(offset, offset + len);
  ctx.lineTo(offset, offset + 8);
  ctx.arcTo(offset, offset, offset + 8, offset, 8);
  ctx.lineTo(offset + len, offset);
  ctx.stroke();

  // Bottom-right corner — pink gradient stroke
  const brGrad = ctx.createLinearGradient(
    WIDTH - offset - len,
    HEIGHT - offset - len,
    WIDTH - offset,
    HEIGHT - offset
  );
  brGrad.addColorStop(0, 'rgba(232, 93, 138, 0)');
  brGrad.addColorStop(1, 'rgba(232, 93, 138, 0.7)');

  ctx.strokeStyle = brGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(WIDTH - offset - len, HEIGHT - offset);
  ctx.lineTo(WIDTH - offset - 8, HEIGHT - offset);
  ctx.arcTo(WIDTH - offset, HEIGHT - offset, WIDTH - offset, HEIGHT - offset - 8, 8);
  ctx.lineTo(WIDTH - offset, HEIGHT - offset - len);
  ctx.stroke();
}

// ── Main renderer ────────────────────────────────────────────────

export async function renderProfileCard(profile: UserProfile): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  const { statistics: stats } = profile;
  const L = 28;
  const R = WIDTH - 28;

  // ── Background ──
  ctx.fillStyle = BG;
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 12);
  ctx.fill();

  // Clip to card shape
  ctx.save();
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 12);
  ctx.clip();

  // Subtle gradient
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0, 'rgba(124, 91, 245, 0.03)');
  bgGrad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ── Background anime covers mosaic ──
  const allCovers = profile.favourites.filter(f => f.coverImage);
  if (allCovers.length > 0) {
    const tileW = 75;
    const tileH = 106;
    const cols = Math.ceil(WIDTH / tileW) + 1;
    const rows = Math.ceil(HEIGHT / tileH) + 1;

    const coverImages: HTMLImageElement[] = [];
    for (const fav of allCovers.slice(0, 10)) {
      const img = await loadImage(fav.coverImage!);
      if (img) coverImages.push(img);
    }

    if (coverImages.length > 0) {
      ctx.globalAlpha = 0.12;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * tileW + (row % 2 === 1 ? -tileW / 3 : 0);
          const y = row * tileH;
          const img = coverImages[(row * cols + col) % coverImages.length];
          ctx.drawImage(img, x, y, tileW, tileH);
        }
      }
      ctx.globalAlpha = 1;

      // Dark overlay — let covers peek through noticeably
      ctx.fillStyle = BG;
      ctx.globalAlpha = 0.72;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.globalAlpha = 1;

      // Extra darken on left half for text readability
      const leftShade = ctx.createLinearGradient(0, 0, WIDTH * 0.55, 0);
      leftShade.addColorStop(0, 'rgba(12, 12, 18, 0.5)');
      leftShade.addColorStop(1, 'rgba(12, 12, 18, 0)');
      ctx.fillStyle = leftShade;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  // ── Avatar ──
  let y = 22;
  const avatarSize = 50;
  if (profile.avatar) {
    const avatarImg = await loadImage(profile.avatar);
    if (avatarImg) {
      ctx.save();
      roundRect(ctx, L, y, avatarSize, avatarSize, 12);
      ctx.clip();
      ctx.drawImage(avatarImg, L, y, avatarSize, avatarSize);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, L, y, avatarSize, avatarSize, 12);
      ctx.stroke();
    }
  }

  // ── Username + inline stats ──
  const nameX = L + avatarSize + 12;
  ctx.fillStyle = TEXT;
  ctx.font = `bold 18px ${FONT}`;
  ctx.textBaseline = 'middle';
  drawTruncated(ctx, profile.name, nameX, y + 17, 220);

  ctx.fillStyle = TEXT_DIM;
  ctx.font = `11px ${FONT}`;
  const statLine = [
    `${stats.count} anime`,
    `${formatNumber(stats.episodesWatched)} odc`,
    `${formatDays(stats.minutesWatched)} ${formatDaysUnit(stats.minutesWatched)}`,
    `\u2605 ${stats.meanScore > 0 ? stats.meanScore.toFixed(1) : '\u2014'}`,
  ].join('  \u00B7  ');
  drawTruncated(ctx, statLine, nameX, y + 38, R - nameX);

  y += avatarSize + 18;

  // ── Status bar ──
  const totalStatus = stats.statuses.reduce((sum, s) => sum + s.count, 0) || 1;
  if (stats.statuses.length > 0) {
    const barH = 5;
    let barX = L;
    const barW = 300;

    ctx.fillStyle = BG_BAR;
    ctx.globalAlpha = 0.6;
    roundRect(ctx, barX, y, barW, barH, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.save();
    roundRect(ctx, barX, y, barW, barH, 3);
    ctx.clip();
    for (const s of stats.statuses) {
      const segW = (s.count / totalStatus) * barW;
      if (segW < 1) continue;
      ctx.fillStyle = STATUS_PALETTE[s.name] ?? TEXT_FAINT;
      ctx.fillRect(barX, y, segW, barH);
      barX += segW;
    }
    ctx.restore();

    y += barH + 8;
    let legendX = L;
    ctx.textBaseline = 'middle';
    for (const s of stats.statuses) {
      if (s.count === 0) continue;
      ctx.fillStyle = STATUS_PALETTE[s.name] ?? TEXT_FAINT;
      ctx.font = `bold 8px ${FONT}`;
      ctx.fillText('\u25CF', legendX, y);
      legendX += 9;
      ctx.fillStyle = TEXT_DIM;
      ctx.font = `9px ${FONT}`;
      const label = String(s.count);
      ctx.fillText(label, legendX, y);
      legendX += ctx.measureText(label).width + 10;
    }
    y += 15;
  }

  // ── Left: Genre bars ──
  const leftColW = 330;
  const topGenres = stats.genres.slice(0, 7);
  if (topGenres.length > 0) {
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = `bold 8px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.fillText('GATUNKI', L, y);
    y += 13;

    const maxCount = Math.max(...topGenres.map(g => g.count), 1);
    const barH = 13;
    const barGap = 4;
    const labelW = 66;
    const barArea = leftColW - labelW - 36;

    for (let i = 0; i < topGenres.length; i++) {
      const genre = topGenres[i];
      const pct = genre.count / maxCount;
      const color = BAR_PALETTE[i % BAR_PALETTE.length];

      ctx.fillStyle = TEXT_DIM;
      ctx.font = `10px ${FONT}`;
      ctx.textBaseline = 'middle';
      drawTruncated(ctx, genre.name, L, y + barH / 2, labelW);

      const bx = L + labelW + 4;
      ctx.fillStyle = BG_BAR;
      ctx.globalAlpha = 0.4;
      roundRect(ctx, bx, y, barArea, barH, 3);
      ctx.fill();
      ctx.globalAlpha = 1;

      const fillW = Math.max(barArea * pct, 3);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.75;
      roundRect(ctx, bx, y, fillW, barH, 3);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = TEXT;
      ctx.font = `bold 9px ${FONT}`;
      ctx.fillText(String(genre.count), bx + fillW + 5, y + barH / 2);

      y += barH + barGap;
    }
  }

  // ── Right: Score chart ──
  const rightX = 395;
  const chartW = R - rightX;
  let ry = avatarSize + 22 + (stats.statuses.length > 0 ? 28 : 0) + 22;

  if (stats.scores.length > 0) {
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = `bold 8px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.fillText('ROZK\u0141AD OCEN', rightX, ry);
    ry += 14;

    const scoreMap = new Map(stats.scores.map(s => [s.score, s.count]));
    const filled = Array.from({ length: 10 }, (_, i) => ({
      score: (i + 1) * 10,
      count: scoreMap.get((i + 1) * 10) ?? 0,
    }));

    const maxScore = Math.max(...filled.map(s => s.count), 1);
    const scoreBarW = (chartW - 9 * 3) / 10;
    const scoreChartH = 85;
    const chartBottom = ry + scoreChartH;

    for (let i = 0; i < 10; i++) {
      const { score, count } = filled[i];
      const pct = count / maxScore;
      const barH = Math.max(scoreChartH * pct, 2);
      const x = rightX + i * (scoreBarW + 3);
      const by = chartBottom - barH;

      ctx.fillStyle = SCORE_COLORS[score] ?? BRAND;
      ctx.globalAlpha = 0.85;
      roundRect(ctx, x, by, scoreBarW, barH, 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (count > 0 && pct > 0.25) {
        ctx.fillStyle = TEXT;
        ctx.font = `bold 8px ${FONT}`;
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'center';
        ctx.fillText(String(count), x + scoreBarW / 2, by - 2);
        ctx.textAlign = 'left';
      }

      ctx.fillStyle = TEXT_FAINT;
      ctx.font = `8px ${FONT}`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillText(String(score / 10), x + scoreBarW / 2, chartBottom + 3);
      ctx.textAlign = 'left';
    }

    ry = chartBottom + 16;
  }

  // ── Right: Studios ──
  const topStudios = stats.studios.slice(0, 4);
  if (topStudios.length > 0) {
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = `bold 8px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.fillText('STUDIA', rightX, ry);
    ry += 13;

    for (const studio of topStudios) {
      ctx.fillStyle = TEXT_DIM;
      ctx.font = `10px ${FONT}`;
      ctx.textBaseline = 'top';
      drawTruncated(ctx, studio.name, rightX, ry, chartW - 30);
      ctx.fillStyle = TEXT_FAINT;
      ctx.font = `9px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(String(studio.count), R, ry + 1);
      ctx.textAlign = 'left';
      ry += 15;
    }
  }

  // ── Bottom branding ──
  const bottomY = HEIGHT - 32;
  ctx.fillStyle = DIVIDER;
  ctx.fillRect(L, bottomY, R - L, 1);

  const brandY = bottomY + 15;

  // Right: username + date
  const date = new Date().toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `9px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(`${profile.name} \u00B7 ${date}`, R, brandY);
  ctx.textAlign = 'left';

  // Restore card clip before drawing corner accents
  ctx.restore();

  // ── Corner accent strokes (outside clip) ──
  drawCornerAccents(ctx);

  // ── Bottom-left: Logo + ShiroAni name ──
  const logoSize = 20;
  const logoX = L;
  const logoY = HEIGHT - 28;

  // Try to load the chibi logo
  const logo = await loadLocalImage(`${window.location.origin}/shiro-chibi.svg`);
  if (logo) {
    ctx.drawImage(logo, logoX, logoY - 2, logoSize, logoSize);
  }

  ctx.fillStyle = BRAND;
  ctx.font = `bold 12px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('ShiroAni', logoX + logoSize + 6, logoY + logoSize / 2);

  const bw = ctx.measureText('ShiroAni').width;
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `9px ${FONT}`;
  ctx.fillText('shiroani.app', logoX + logoSize + 6 + bw + 6, logoY + logoSize / 2);

  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.replace(/^data:image\/png;base64,/, '');
}

export async function renderProfileCardDataUrl(profile: UserProfile): Promise<string> {
  const base64 = await renderProfileCard(profile);
  return `data:image/png;base64,${base64}`;
}
