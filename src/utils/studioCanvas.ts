import {
  BACKGROUND_PRESETS,
  getAgeOption,
  type BackgroundPresetId,
  type BadgePosition,
  type BadgeStyle,
} from './vintedEngine';

export interface StudioRenderOptions {
  imageSrc: string;
  age: string;
  brand: string;
  bundleCount?: number;
  condition?: string;
  backgroundPreset: BackgroundPresetId;
  badgePosition: BadgePosition;
  badgeStyle: BadgeStyle;
  showBrandOnPhoto: boolean;
  detourageStrength: number; // 0 (off) to 100 (aggressive)
  outputSize?: number;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * Harmonizes a global flat-lay photo (whether 5-10 items laid out in a grid or a single item)
 * onto the selected neutral studio background while preserving aspect ratio so outer garments
 * in a 5-10 piece lot are never cropped off.
 */
function harmonizeStudioSubject(
  img: HTMLImageElement,
  detourageStrength: number,
  targetBgHex: string,
  targetInnerHex: string
): HTMLCanvasElement {
  const workSize = 720;
  const offscreen = document.createElement('canvas');
  offscreen.width = workSize;
  offscreen.height = workSize;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return offscreen;

  // Light trim (3.5%) to remove outer window frame edges while keeping all 5-10 garments in lot
  const cropMarginX = Math.round(img.naturalWidth * 0.035);
  const cropMarginY = Math.round(img.naturalHeight * 0.035);
  const srcW = Math.max(1, img.naturalWidth - cropMarginX * 2);
  const srcH = Math.max(1, img.naturalHeight - cropMarginY * 2);

  const aspect = srcW / srcH;
  const pad = Math.round(workSize * 0.045);
  const maxDrawDim = workSize - pad * 2;

  const drawW = aspect >= 1 ? maxDrawDim : Math.round(maxDrawDim * aspect);
  const drawH = aspect >= 1 ? Math.round(maxDrawDim / aspect) : maxDrawDim;
  const offsetX = Math.round((workSize - drawW) / 2);
  const offsetY = Math.round((workSize - drawH) / 2);

  const [bgR, bgG, bgB] = hexToRgb(targetBgHex);
  const [inR, inG, inB] = hexToRgb(targetInnerHex);

  ctx.fillStyle = targetInnerHex;
  ctx.fillRect(0, 0, workSize, workSize);

  ctx.drawImage(img, cropMarginX, cropMarginY, srcW, srcH, offsetX, offsetY, drawW, drawH);

  if (detourageStrength <= 0) {
    return offscreen;
  }

  const imgData = ctx.getImageData(0, 0, workSize, workSize);
  const data = imgData.data;

  // Sample 4 border strips inside the drawn rectangle
  const topY = offsetY + 5;
  const botY = offsetY + drawH - 6;
  const leftX = offsetX + 5;
  const rightX = offsetX + drawW - 6;

  const topSamples: [number, number, number][] = [];
  const bottomSamples: [number, number, number][] = [];
  const leftSamples: [number, number, number][] = [];
  const rightSamples: [number, number, number][] = [];

  for (let x = offsetX + 6; x < offsetX + drawW - 6; x += 6) {
    const iT = (topY * workSize + x) * 4;
    topSamples.push([data[iT], data[iT + 1], data[iT + 2]]);
    const iB = (botY * workSize + x) * 4;
    bottomSamples.push([data[iB], data[iB + 1], data[iB + 2]]);
  }

  for (let y = offsetY + 6; y < offsetY + drawH - 6; y += 6) {
    const iL = (y * workSize + leftX) * 4;
    leftSamples.push([data[iL], data[iL + 1], data[iL + 2]]);
    const iR = (y * workSize + rightX) * 4;
    rightSamples.push([data[iR], data[iR + 1], data[iR + 2]]);
  }

  const medianRgb = (arr: [number, number, number][]): [number, number, number] => {
    if (arr.length === 0) return [230, 230, 230];
    const sorted = [...arr].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    return sorted[Math.floor(sorted.length * 0.5)];
  };

  const refTop = medianRgb(topSamples);
  const refBottom = medianRgb(bottomSamples);
  const refLeft = medianRgb(leftSamples);
  const refRight = medianRgb(rightSamples);

  const strength = Math.max(0.15, Math.min(1, detourageStrength / 100));
  const lowThresh = 6 + strength * 10;
  const highThresh = lowThresh + 18 + (1 - strength) * 10;

  const center = workSize * 0.5;
  const maxRadius = workSize * 0.5;

  for (let y = 0; y < workSize; y++) {
    const ny = Math.max(0, Math.min(1, (y - offsetY) / Math.max(1, drawH)));
    for (let x = 0; x < workSize; x++) {
      const idx = (y * workSize + x) * 4;

      const dxCenter = (x - center) / maxRadius;
      const dyCenter = (y - center) / maxRadius;
      const radialDist = Math.min(1, Math.hypot(dxCenter, dyCenter));
      const targetR = inR * (1 - radialDist * 0.65) + bgR * (radialDist * 0.65);
      const targetG = inG * (1 - radialDist * 0.65) + bgG * (radialDist * 0.65);
      const targetB = inB * (1 - radialDist * 0.65) + bgB * (radialDist * 0.65);

      if (x < offsetX || x >= offsetX + drawW || y < offsetY || y >= offsetY + drawH) {
        data[idx] = targetR;
        data[idx + 1] = targetG;
        data[idx + 2] = targetB;
        data[idx + 3] = 255;
        continue;
      }

      const nx = Math.max(0, Math.min(1, (x - offsetX) / Math.max(1, drawW)));
      const expR =
        (refTop[0] * (1 - ny) + refBottom[0] * ny + refLeft[0] * (1 - nx) + refRight[0] * nx) *
        0.5;
      const expG =
        (refTop[1] * (1 - ny) + refBottom[1] * ny + refLeft[1] * (1 - nx) + refRight[1] * nx) *
        0.5;
      const expB =
        (refTop[2] * (1 - ny) + refBottom[2] * ny + refLeft[2] * (1 - nx) + refRight[2] * nx) *
        0.5;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const dLuma = Math.abs(
        r * 0.299 + g * 0.587 + b * 0.114 - (expR * 0.299 + expG * 0.587 + expB * 0.114)
      );
      const dRg = Math.abs(r - g - (expR - expG));
      const dYb = Math.abs((r + g) * 0.5 - b - ((expR + expG) * 0.5 - expB));
      const diff = dLuma * 0.65 + Math.hypot(dRg, dYb) * 1.85;

      const borderDistPx = Math.min(
        x - offsetX,
        offsetX + drawW - 1 - x,
        y - offsetY,
        offsetY + drawH - 1 - y
      );
      const perimeterFade = smoothstep(0, Math.round(Math.min(drawW, drawH) * 0.06), borderDistPx);

      const rawFgWeight = smoothstep(lowThresh, highThresh, diff);
      const fgWeight = Math.min(1, rawFgWeight) * perimeterFade;

      const fgR = Math.min(255, Math.max(0, (r - 128) * 1.04 + 128));
      const fgG = Math.min(255, Math.max(0, (g - 128) * 1.04 + 128));
      const fgB = Math.min(255, Math.max(0, (b - 128) * 1.04 + 128));

      data[idx] = Math.round(fgR * fgWeight + targetR * (1 - fgWeight));
      data[idx + 1] = Math.round(fgG * fgWeight + targetG * (1 - fgWeight));
      data[idx + 2] = Math.round(fgB * fgWeight + targetB * (1 - fgWeight));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return offscreen;
}

function stampBundleAndAgeBadge(
  ctx: CanvasRenderingContext2D,
  size: number,
  options: {
    age: string;
    brand: string;
    bundleCount?: number;
    condition?: string;
    badgePosition: BadgePosition;
    badgeStyle: BadgeStyle;
    showBrandOnPhoto: boolean;
  }
) {
  const ageOpt = getAgeOption(options.age);
  const count = options.bundleCount ?? 6;
  const ageHeadline =
    count > 1
      ? `LOT ${count} HABITS · ${ageOpt.label.toUpperCase()}`
      : ageOpt.label.toUpperCase();

  const cmSubtitle = ageOpt.sizeCm;
  const brandSubtitle =
    options.showBrandOnPhoto && options.brand.trim()
      ? options.brand.trim().toUpperCase()
      : '';

  const palette =
    options.badgeStyle === 'dark-boutique'
      ? {
          bg: 'rgba(15, 23, 42, 0.94)',
          border: 'rgba(255, 255, 255, 0.18)',
          textMain: '#FFFFFF',
          textSub: '#CBD5E1',
          accent: '#2DD4BF',
        }
      : options.badgeStyle === 'teal-vinted'
        ? {
            bg: 'rgba(13, 148, 136, 0.95)',
            border: 'rgba(255, 255, 255, 0.28)',
            textMain: '#FFFFFF',
            textSub: '#CCFBF1',
            accent: '#FFFFFF',
          }
        : {
            bg: 'rgba(255, 253, 249, 0.96)',
            border: '#CBD5E1',
            textMain: '#0F172A',
            textSub: '#475569',
            accent: '#0F766E',
          };

  const pad = Math.round(size * 0.032);

  if (options.badgePosition === 'bottom-bar') {
    const barH = Math.round(size * 0.105);
    const barY = size - barH - pad;
    const barX = pad;
    const barW = size - pad * 2;

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    drawRoundedRect(ctx, barX, barY, barW, barH, Math.round(size * 0.02));
    ctx.fillStyle = palette.bg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.border;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = palette.textMain;
    ctx.font = `700 ${Math.round(size * 0.032)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(
      brandSubtitle || 'DRESSING ENFANT',
      barX + Math.round(size * 0.03),
      barY + barH * 0.42
    );

    ctx.fillStyle = palette.textSub;
    ctx.font = `500 ${Math.round(size * 0.022)}px "DM Sans", sans-serif`;
    ctx.fillText(
      `${options.condition || 'Très bon état'} · Taille ${cmSubtitle}`,
      barX + Math.round(size * 0.03),
      barY + barH * 0.74
    );

    ctx.fillStyle = palette.accent;
    ctx.font = `700 ${Math.round(size * 0.038)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(ageHeadline, barX + barW - Math.round(size * 0.03), barY + barH * 0.54);
  } else {
    ctx.font = `700 ${Math.round(size * 0.038)}px "Plus Jakarta Sans", sans-serif`;
    const ageWidth = ctx.measureText(ageHeadline).width;

    const subLine = brandSubtitle
      ? `TAILLE ${cmSubtitle.toUpperCase()} · ${brandSubtitle}`
      : `TAILLE ${cmSubtitle.toUpperCase()}`;
    ctx.font = `600 ${Math.round(size * 0.02)}px "DM Sans", sans-serif`;
    const subWidth = ctx.measureText(subLine).width;

    const cardW = Math.min(size - pad * 2, Math.max(ageWidth, subWidth) + Math.round(size * 0.06));
    const cardH = Math.round(size * 0.112);

    const cardX = options.badgePosition === 'top-left' ? pad : size - cardW - pad;
    const cardY = options.badgePosition === 'bottom-right' ? size - cardH - pad : pad;

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, Math.round(size * 0.02));
    ctx.fillStyle = palette.bg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.border;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = palette.textMain;
    ctx.font = `700 ${Math.round(size * 0.038)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ageHeadline, cardX + cardW / 2, cardY + cardH * 0.43);

    ctx.fillStyle = palette.textSub;
    ctx.font = `600 ${Math.round(size * 0.019)}px "DM Sans", sans-serif`;
    ctx.fillText(subLine, cardX + cardW / 2, cardY + cardH * 0.77);
  }
}

export async function renderCleanStudioPhoto(options: StudioRenderOptions): Promise<string> {
  const size = options.outputSize ?? 960;
  const img = await loadImageElement(options.imageSrc);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return options.imageSrc;

  const preset =
    BACKGROUND_PRESETS.find((p) => p.id === options.backgroundPreset) ?? BACKGROUND_PRESETS[0];

  const studioSubject = harmonizeStudioSubject(
    img,
    options.detourageStrength,
    preset.hex,
    preset.innerHex
  );

  ctx.drawImage(studioSubject, 0, 0, size, size);

  ctx.strokeStyle = preset.borderHex;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  stampBundleAndAgeBadge(ctx, size, options);

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Stitches 2 to 10 individual garment photos into a single numbered Global Bundle Photo (#1 to #N)
 * on a neutral studio background with the Lot + Age badge stamped on top.
 */
export async function renderMultiPhotoBundleCollage(
  imageSrcs: string[],
  options: Omit<StudioRenderOptions, 'imageSrc'>
): Promise<string> {
  const size = options.outputSize ?? 1080;
  const imgs = await Promise.all(imageSrcs.slice(0, 10).map((src) => loadImageElement(src)));
  const count = imgs.length;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSrcs[0] || '';

  const preset =
    BACKGROUND_PRESETS.find((p) => p.id === options.backgroundPreset) ?? BACKGROUND_PRESETS[0];

  ctx.fillStyle = preset.hex;
  ctx.fillRect(0, 0, size, size);

  const cols = count <= 4 ? 2 : count <= 6 ? 3 : count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / cols);

  const outerPad = Math.round(size * 0.04);
  const topReserve = options.badgePosition !== 'bottom-right' && options.badgePosition !== 'bottom-bar'
    ? Math.round(size * 0.13)
    : outerPad;
  const bottomReserve =
    options.badgePosition === 'bottom-bar' || options.badgePosition === 'bottom-right'
      ? Math.round(size * 0.13)
      : outerPad;

  const gap = Math.round(size * 0.02);
  const availW = size - outerPad * 2 - gap * (cols - 1);
  const availH = size - topReserve - bottomReserve - gap * (rows - 1);
  const cellW = Math.floor(availW / cols);
  const cellH = Math.floor(availH / rows);

  imgs.forEach((img, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = outerPad + col * (cellW + gap);
    const y = topReserve + row * (cellH + gap);

    ctx.save();
    drawRoundedRect(ctx, x, y, cellW, cellH, 16);
    ctx.fillStyle = preset.innerHex;
    ctx.fill();
    ctx.strokeStyle = preset.borderHex;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();

    const scale = Math.min(cellW / img.naturalWidth, cellH / img.naturalHeight) * 0.92;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);

    // Draw small article number pill (#1, #2, ...)
    const numBadgeSize = Math.round(size * 0.036);
    drawRoundedRect(ctx, x + 10, y + 10, numBadgeSize * 1.35, numBadgeSize, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(size * 0.02)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${idx + 1}`, x + 10 + (numBadgeSize * 1.35) / 2, y + 10 + numBadgeSize / 2);
    ctx.restore();
  });

  stampBundleAndAgeBadge(ctx, size, {
    ...options,
    bundleCount: count,
  });

  return canvas.toDataURL('image/jpeg', 0.92);
}
