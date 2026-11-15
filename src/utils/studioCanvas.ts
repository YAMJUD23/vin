import {
  BACKGROUND_PRESETS,
  getAgeOption,
  type BackgroundPresetId,
  type BadgePosition,
  type BadgeStyle,
  type StudioPresentationMode,
} from './vintedEngine';

export interface GarmentCropBox {
  ymin: number; // 0..1
  xmin: number; // 0..1
  ymax: number; // 0..1
  xmax: number; // 0..1
  label?: string;
}

export interface StudioRenderOptions {
  imageSrc: string;
  age: string;
  brand: string;
  bundleCount?: number;
  pricePerPiece?: number;
  recommendedPrice?: number;
  condition?: string;
  backgroundPreset: BackgroundPresetId;
  presentationMode?: StudioPresentationMode;
  badgePosition: BadgePosition;
  badgeStyle: BadgeStyle;
  showBrandOnPhoto: boolean;
  detourageStrength: number; // 0 to 100 (Controls Natural Daylight Softbox & Textile Clarity)
  garmentBoxes?: GarmentCropBox[];
  bundleItemsList?: string[];
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

function clampByte(val: number): number {
  return val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
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
 * Draws a clean Vinted studio board backdrop (Blanc Studio, Lin Naturel, Gris Perle, Ivoire Doux).
 */
function drawStudioBackdrop(
  ctx: CanvasRenderingContext2D,
  size: number,
  bgHex: string,
  innerHex: string,
  presetId: BackgroundPresetId
) {
  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.48,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.75
  );
  grad.addColorStop(0, innerHex);
  grad.addColorStop(1, bgHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  if (presetId === 'natural-linen' || presetId === 'warm-ivory') {
    ctx.save();
    ctx.strokeStyle =
      presetId === 'natural-linen'
        ? 'rgba(175, 155, 130, 0.07)'
        : 'rgba(185, 170, 145, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 6) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * Pure Optical Studio Softbox & Textile Clarity Grading (ZERO blotchy pixel replacement!):
 * 1. Corrects warm/yellow indoor lighting (Auto White-Balance)
 * 2. Smooth 2D Softbox Corner Lift: gently equalizes vignetted/dark room corners so lighting looks even
 *    without ever creating artificial white blotches or eating into white/beige sleeves!
 * 3. Lifts shadows in dark fabric folds & boosts selective color vibrance
 * 4. 3x3 Luminance Unsharp Mask so knitwear, corduroy, denim, and brand tags look super crisp
 */
function applyOpticalStudioLighting(
  imgData: ImageData,
  strengthPct: number // 0..100
): void {
  const { width, height, data } = imgData;
  const totalPixels = width * height;
  if (totalPixels === 0 || strengthPct <= 2) return;

  const strength = Math.max(0.1, Math.min(1, strengthPct / 100));

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumLuma = 0;
  let sampleCount = 0;

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma > 40 && luma < 245) {
      sumR += r;
      sumG += g;
      sumB += b;
      sumLuma += luma;
      sampleCount++;
    }
  }

  const avgR = sampleCount > 0 ? sumR / sampleCount : 128;
  const avgG = sampleCount > 0 ? sumG / sampleCount : 128;
  const avgB = sampleCount > 0 ? sumB / sampleCount : 128;
  const avgGray = (avgR + avgG + avgB) / 3;
  const avgLuma = sampleCount > 0 ? sumLuma / sampleCount : 145;

  const wbStrength = 0.32 * strength;
  const gainR =
    1 + Math.max(-0.07, Math.min(0.07, ((avgGray - avgR) / Math.max(60, avgR)) * wbStrength));
  const gainG =
    1 + Math.max(-0.05, Math.min(0.05, ((avgGray - avgG) / Math.max(60, avgG)) * wbStrength));
  const gainB =
    1 + Math.max(-0.08, Math.min(0.08, ((avgGray - avgB) / Math.max(60, avgB)) * wbStrength));

  const exposureLift = avgLuma < 130 ? Math.min(0.18, (135 - avgLuma) / 340) : 0.02;
  const shadowLiftAmount = (0.08 + strength * 0.08 + exposureLift) * strength;
  const contrastAmount = 1 + 0.06 * strength;
  const vibranceAmount = 0.14 * strength;

  const lumaBuffer = new Float32Array(totalPixels);
  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxDist = Math.hypot(cx, cy) || 1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const dy = y - cy;
    for (let x = 0; x < width; x++) {
      const p = rowOffset + x;
      const idx = p * 4;

      // Soft optical anti-vignetting: gently brightens dark room corners (max +6% at extreme corners)
      const cornerRatio = Math.hypot(x - cx, dy) / maxDist;
      const cornerSoftboxGain = 1 + cornerRatio * cornerRatio * 0.065 * strength;

      const r = data[idx] * gainR * cornerSoftboxGain;
      const g = data[idx + 1] * gainG * cornerSoftboxGain;
      const b = data[idx + 2] * gainB * cornerSoftboxGain;

      let nr = Math.max(0, Math.min(1, r / 255));
      let ng = Math.max(0, Math.min(1, g / 255));
      let nb = Math.max(0, Math.min(1, b / 255));

      // Smooth shadow lift that preserves highlight detail on white & cream clothes
      nr = nr + shadowLiftAmount * nr * (1 - nr) * (1 - nr * 0.6);
      ng = ng + shadowLiftAmount * ng * (1 - ng) * (1 - ng * 0.6);
      nb = nb + shadowLiftAmount * nb * (1 - nb) * (1 - nb * 0.6);

      // Gentle midtone contrast
      nr = Math.max(0, Math.min(1, (nr - 0.5) * contrastAmount + 0.5));
      ng = Math.max(0, Math.min(1, (ng - 0.5) * contrastAmount + 0.5));
      nb = Math.max(0, Math.min(1, (nb - 0.5) * contrastAmount + 0.5));

      // Selective fabric vibrance
      const maxC = Math.max(nr, ng, nb);
      const minC = Math.min(nr, ng, nb);
      const sat = maxC - minC;
      const luma = 0.299 * nr + 0.587 * ng + 0.114 * nb;
      const vibBoost = vibranceAmount * (1 - sat * sat);

      nr = Math.max(0, Math.min(1, luma + (nr - luma) * (1 + vibBoost)));
      ng = Math.max(0, Math.min(1, luma + (ng - luma) * (1 + vibBoost)));
      nb = Math.max(0, Math.min(1, luma + (nb - luma) * (1 + vibBoost)));

      const outR = nr * 255;
      const outG = ng * 255;
      const outB = nb * 255;

      data[idx] = clampByte(outR);
      data[idx + 1] = clampByte(outG);
      data[idx + 2] = clampByte(outB);

      lumaBuffer[p] = 0.299 * outR + 0.587 * outG + 0.114 * outB;
    }
  }

  // 3x3 Luminance Unsharp Mask so textile weave, stitching & buttons look crisp
  const sharpAmount = (0.22 + strength * 0.24) * strength;
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const p = rowOffset + x;
      const centerLuma = lumaBuffer[p];
      const blurLuma =
        (lumaBuffer[p - width - 1] +
          lumaBuffer[p - width] * 2 +
          lumaBuffer[p - width + 1] +
          lumaBuffer[p - 1] * 2 +
          centerLuma * 4 +
          lumaBuffer[p + 1] * 2 +
          lumaBuffer[p + width - 1] +
          lumaBuffer[p + width] * 2 +
          lumaBuffer[p + width + 1]) /
        16;

      const detail = (centerLuma - blurLuma) * sharpAmount;
      if (Math.abs(detail) > 0.35) {
        const idx = p * 4;
        data[idx] = clampByte(data[idx] + detail);
        data[idx + 1] = clampByte(data[idx + 1] + detail);
        data[idx + 2] = clampByte(data[idx + 2] + detail);
      }
    }
  }
}

/**
 * Computes clean, non-overlapping garment cells for the 5-10 items in a global bundle photo.
 * Uses a 3.5% inner safety inset on each cell so adjacent sleeves never bleed into a neighbor's card!
 */
function computeCleanGarmentCells(
  img: HTMLImageElement,
  bundleCount: number,
  providedBoxes?: GarmentCropBox[]
): GarmentCropBox[] {
  const count = Math.max(2, Math.min(12, bundleCount || 6));
  if (providedBoxes && providedBoxes.length >= 2) {
    return providedBoxes.slice(0, count);
  }

  const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  let cols = 3;
  let rows = 2;

  if (count <= 4) {
    cols = 2;
    rows = Math.ceil(count / 2);
  } else if (count <= 6) {
    cols = aspect >= 0.85 ? 3 : 2;
    rows = Math.ceil(count / cols);
  } else if (count <= 8) {
    cols = aspect >= 0.9 ? 4 : 2;
    rows = Math.ceil(count / cols);
  } else if (count === 9) {
    cols = 3;
    rows = 3;
  } else {
    cols = aspect >= 0.9 ? 5 : 3;
    rows = Math.ceil(count / cols);
  }

  // Outer margin of the flat-lay photo + safety inset between cells so neighbor sleeves don't overlap
  const outerMarginX = 0.04;
  const outerMarginY = 0.05;
  const usableW = 1 - outerMarginX * 2;
  const usableH = 1 - outerMarginY * 2;
  const cellW = usableW / cols;
  const cellH = usableH / rows;
  const insetX = cellW * 0.045;
  const insetY = cellH * 0.045;

  const boxes: GarmentCropBox[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const xmin = outerMarginX + col * cellW + insetX;
    const xmax = outerMarginX + (col + 1) * cellW - insetX;
    const ymin = outerMarginY + row * cellH + insetY;
    const ymax = outerMarginY + (row + 1) * cellH - insetY;
    boxes.push({ ymin, xmin, ymax, xmax });
  }

  return boxes;
}

/**
 * Draws the dedicated Vinted Top-Seller Header Bar at the top of the studio board:
 * - Left: Brand + Size CM + Condition
 * - Right: LOT X HABITS · AGE + Price per piece callout pill ("5,25 € / habit")
 * Never overlaps the garments!
 */
function drawTopVintedHeaderBar(
  ctx: CanvasRenderingContext2D,
  size: number,
  options: StudioRenderOptions
): number {
  const ageOpt = getAgeOption(options.age);
  const count = options.bundleCount ?? 6;
  const headerH = Math.round(size * 0.115);
  const padX = Math.round(size * 0.032);

  const palette =
    options.badgeStyle === 'dark-boutique'
      ? {
          bg: '#0F172A',
          textMain: '#FFFFFF',
          textSub: '#CBD5E1',
          pillBg: '#0F766E',
          pillBorder: '#2DD4BF',
          pillText: '#FFFFFF',
          accent: '#2DD4BF',
        }
      : options.badgeStyle === 'teal-vinted'
        ? {
            bg: '#0F766E',
            textMain: '#FFFFFF',
            textSub: '#CCFBF1',
            pillBg: '#0F172A',
            pillBorder: '#5EEAD4',
            pillText: '#2DD4BF',
            accent: '#FFFFFF',
          }
        : {
            bg: '#FFFFFF',
            textMain: '#0F172A',
            textSub: '#475569',
            pillBg: '#F0FDFA',
            pillBorder: '#0F766E',
            pillText: '#0F766E',
            accent: '#0F766E',
          };

  // Header background card
  const barY = Math.round(size * 0.022);
  const barW = size - padX * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  drawRoundedRect(ctx, padX, barY, barW, headerH, Math.round(size * 0.018));
  ctx.fillStyle = palette.bg;
  ctx.fill();
  if (options.badgeStyle === 'cream-label') {
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // Left side: LOT X HABITS · AGE + Brand & Size CM
  const headline =
    count > 1
      ? `LOT ${count} HABITS · ${ageOpt.label.toUpperCase()}`
      : `TAILLE ${ageOpt.label.toUpperCase()}`;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.textMain;
  ctx.font = `800 ${Math.round(size * 0.033)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(headline, padX + Math.round(size * 0.024), barY + headerH * 0.38);

  const brandText =
    options.showBrandOnPhoto && options.brand.trim()
      ? `${options.brand.trim().toUpperCase()} · `
      : '';
  const subText = `${brandText}TAILLE ${ageOpt.sizeCm.toUpperCase()} · ${(options.condition || 'Très bon état').toUpperCase()}`;
  ctx.fillStyle = palette.textSub;
  ctx.font = `600 ${Math.round(size * 0.0175)}px "DM Sans", sans-serif`;
  ctx.fillText(subText, padX + Math.round(size * 0.024), barY + headerH * 0.74);
  ctx.restore();

  // Right side: Price-per-piece callout badge ("REVIENT À 5,25 € / HABIT")
  if (options.pricePerPiece && options.pricePerPiece > 0) {
    const pillW = Math.round(size * 0.25);
    const pillH = Math.round(headerH * 0.74);
    const pillX = padX + barW - pillW - Math.round(size * 0.016);
    const pillY = barY + Math.round((headerH - pillH) / 2);

    ctx.save();
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, Math.round(size * 0.012));
    ctx.fillStyle = palette.pillBg;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.pillBorder;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = options.badgeStyle === 'cream-label' ? '#475569' : '#CCFBF1';
    ctx.font = `600 ${Math.round(size * 0.013)}px "DM Sans", sans-serif`;
    ctx.fillText('PRIX MINI EN LOT', pillX + pillW / 2, pillY + pillH * 0.32);

    ctx.fillStyle = palette.pillText;
    ctx.font = `700 ${Math.round(size * 0.0235)}px "JetBrains Mono", monospace`;
    ctx.fillText(
      `${options.pricePerPiece.toFixed(2).replace('.', ',')} € / habit`,
      pillX + pillW / 2,
      pillY + pillH * 0.7
    );
    ctx.restore();
  }

  return barY + headerH + Math.round(size * 0.018);
}

function drawBottomTrustStrip(
  ctx: CanvasRenderingContext2D,
  size: number,
  condition?: string
) {
  const stripY = size - Math.round(size * 0.025);
  ctx.save();
  ctx.font = `600 ${Math.round(size * 0.016)}px "DM Sans", sans-serif`;
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const conditionText = (condition || 'Très bon état').toUpperCase();
  ctx.fillText(
    `✓ ${conditionText}   ·   ✓ LINGE PROPRE & SOIGNÉ   ·   ✓ MAISON NON-FUMEUR`,
    size / 2,
    stripY
  );
  ctx.restore();
}

/**
 * MODE 1: Grille Alignée (#1 à #N) — Isolates, centers, and labels each garment in its own clean studio card!
 */
function renderAlignedCatalogGridMode(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  options: StudioRenderOptions,
  preset: (typeof BACKGROUND_PRESETS)[number]
) {
  drawStudioBackdrop(ctx, size, preset.hex, preset.innerHex, options.backgroundPreset);

  const topContentY = drawTopVintedHeaderBar(ctx, size, options);
  const bottomReserve = Math.round(size * 0.052);

  const count = Math.max(2, Math.min(12, options.bundleCount ?? 6));
  const boxes = computeCleanGarmentCells(img, count, options.garmentBoxes);

  const cols = count <= 4 ? 2 : count <= 6 ? 3 : count <= 8 ? 4 : 3;
  const rows = Math.ceil(count / cols);

  const outerPad = Math.round(size * 0.032);
  const gap = Math.round(size * 0.016);
  const availW = size - outerPad * 2 - gap * (cols - 1);
  const availH = size - topContentY - bottomReserve - gap * (rows - 1);
  const cellW = Math.floor(availW / cols);
  const cellH = Math.floor(availH / rows);

  boxes.forEach((box, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cellX = outerPad + col * (cellW + gap);
    const cellY = topContentY + row * (cellH + gap);

    const sx = Math.max(0, Math.floor(box.xmin * img.naturalWidth));
    const sy = Math.max(0, Math.floor(box.ymin * img.naturalHeight));
    const sw = Math.max(16, Math.floor((box.xmax - box.xmin) * img.naturalWidth));
    const sh = Math.max(16, Math.floor((box.ymax - box.ymin) * img.naturalHeight));

    const labelStripH = Math.round(cellH * 0.165);
    const photoAreaH = cellH - labelStripH;
    const innerPad = Math.round(Math.min(cellW, photoAreaH) * 0.035);

    // Cover-fit inside the card photo area so each garment fills its studio card cleanly
    const scale = Math.min(
      (cellW - innerPad * 2) / sw,
      (photoAreaH - innerPad * 2) / sh
    );
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));

    const off = document.createElement('canvas');
    off.width = dw;
    off.height = dh;
    const offCtx = off.getContext('2d', { willReadFrequently: true });
    if (offCtx) {
      offCtx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      const cellData = offCtx.getImageData(0, 0, dw, dh);
      applyOpticalStudioLighting(cellData, options.detourageStrength);
      offCtx.putImageData(cellData, 0, 0);
    }

    const radius = Math.round(size * 0.016);

    // Card elevation shadow
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    drawRoundedRect(ctx, cellX, cellY, cellW, cellH, radius);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, cellX, cellY, cellW, cellH, radius);
    ctx.clip();

    // Fill photo area with soft studio inner tone
    ctx.fillStyle = preset.innerHex;
    ctx.fillRect(cellX, cellY, cellW, photoAreaH);

    const drawX = cellX + Math.round((cellW - dw) / 2);
    const drawY = cellY + Math.round((photoAreaH - dh) / 2);
    ctx.drawImage(off, drawX, drawY, dw, dh);

    // Bottom label strip with article name
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cellX, cellY + photoAreaH, cellW, labelStripH);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cellX, cellY + photoAreaH);
    ctx.lineTo(cellX + cellW, cellY + photoAreaH);
    ctx.stroke();

    const rawItemTitle =
      box.label ||
      options.bundleItemsList?.[idx]?.split('(')[0]?.split('—')[0]?.trim() ||
      `Article #${idx + 1}`;
    const shortTitle =
      rawItemTitle.length > 24 ? rawItemTitle.slice(0, 22) + '…' : rawItemTitle;

    ctx.fillStyle = '#0F172A';
    ctx.font = `600 ${Math.max(11, Math.round(size * 0.015))}px "DM Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shortTitle, cellX + cellW / 2, cellY + photoAreaH + labelStripH / 2);

    // Number pill (#1, #2, ...)
    const pillW = Math.round(size * 0.042);
    const pillH = Math.round(size * 0.03);
    drawRoundedRect(ctx, cellX + 8, cellY + 8, pillW, pillH, 6);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fill();
    ctx.fillStyle = '#2DD4BF';
    ctx.font = `700 ${Math.round(size * 0.017)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${idx + 1}`, cellX + 8 + pillW / 2, cellY + 8 + pillH / 2 + 1);
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, cellX, cellY, cellW, cellH, radius);
    ctx.strokeStyle = preset.borderHex;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  });

  drawBottomTrustStrip(ctx, size, options.condition);
}

/**
 * MODE 3: Affiche Lookbook & Inventaire Vinted ('lookbook-vinted')
 * Shows the enhanced bundle photo on top + a structured 2-column numbered inventory board (#1 to #N)
 * directly on the bottom of the cover photo so Vinted buyers see both the photo and the list of pieces!
 */
function renderLookbookWithInventoryBoard(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  options: StudioRenderOptions,
  preset: (typeof BACKGROUND_PRESETS)[number]
) {
  drawStudioBackdrop(ctx, size, preset.hex, preset.innerHex, options.backgroundPreset);

  const topContentY = drawTopVintedHeaderBar(ctx, size, options);
  const padX = Math.round(size * 0.032);
  const bottomTrustH = Math.round(size * 0.048);

  // Reserve bottom 22% for the 2-column numbered inventory card
  const invH = Math.round(size * 0.21);
  const invY = size - bottomTrustH - invH;
  const photoAvailH = invY - topContentY - Math.round(size * 0.016);
  const photoAvailW = size - padX * 2;

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const scale = Math.min(photoAvailW / srcW, photoAvailH / srcH);
  const drawW = Math.max(1, Math.round(srcW * scale));
  const drawH = Math.max(1, Math.round(srcH * scale));
  const offsetX = Math.round((size - drawW) / 2);
  const offsetY = topContentY + Math.round((photoAvailH - drawH) / 2);

  const off = document.createElement('canvas');
  off.width = drawW;
  off.height = drawH;
  const offCtx = off.getContext('2d', { willReadFrequently: true });
  if (offCtx) {
    offCtx.drawImage(img, 0, 0, srcW, srcH, 0, 0, drawW, drawH);
    const imgData = offCtx.getImageData(0, 0, drawW, drawH);
    applyOpticalStudioLighting(imgData, options.detourageStrength);
    offCtx.putImageData(imgData, 0, 0);
  }

  const radius = Math.round(size * 0.018);
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.09)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 5;
  drawRoundedRect(ctx, offsetX, offsetY, drawW, drawH, radius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, offsetX, offsetY, drawW, drawH, radius);
  ctx.clip();
  ctx.drawImage(off, offsetX, offsetY, drawW, drawH);
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, offsetX, offsetY, drawW, drawH, radius);
  ctx.strokeStyle = preset.borderHex;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Draw the Inventory Checklist Card (#1 to #N) below the photo
  const invW = size - padX * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.07)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  drawRoundedRect(ctx, padX, invY, invW, invH, radius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = preset.borderHex;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  const itemsList = options.bundleItemsList?.slice(0, 8) ?? [];
  const rows = Math.min(4, Math.ceil(itemsList.length / 2));
  const colW = (invW - Math.round(size * 0.04)) / 2;
  const rowH = (invH - Math.round(size * 0.03)) / Math.max(1, rows);

  itemsList.forEach((line, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    if (row >= 4) return;
    const itemX = padX + Math.round(size * 0.02) + col * colW;
    const itemY = invY + Math.round(size * 0.018) + row * rowH + rowH * 0.5;

    const cleanName = line.split('(')[0].split('—')[0].trim();
    const shortName = cleanName.length > 34 ? cleanName.slice(0, 32) + '…' : cleanName;

    // Number badge
    ctx.fillStyle = '#0F766E';
    ctx.font = `700 ${Math.round(size * 0.016)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${idx + 1}`, itemX, itemY);

    ctx.fillStyle = '#1E293B';
    ctx.font = `600 ${Math.round(size * 0.0155)}px "DM Sans", sans-serif`;
    ctx.fillText(shortName, itemX + Math.round(size * 0.032), itemY);
  });

  drawBottomTrustStrip(ctx, size, options.condition);
}

/**
 * Renders the selected Vinted Presentation Mode:
 * - 'studio-pro': Dedicated top Vinted header bar + Optical Studio Softbox & Textile Clarity + Framed Flat-Lay
 * - 'catalogue-grid': Aligned & numbered individual studio cards (#1 to #N)
 * - 'lookbook-vinted': Framed Flat-Lay + On-photo numbered inventory board (#1 to #N)
 * - 'daylight-natural': Full-bleed 1:1 natural daylight photo with corner badge
 */
function renderSubjectByMode(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  options: StudioRenderOptions,
  preset: (typeof BACKGROUND_PRESETS)[number]
) {
  const mode: StudioPresentationMode = options.presentationMode ?? 'studio-pro';

  if (mode === 'catalogue-grid') {
    renderAlignedCatalogGridMode(ctx, img, size, options, preset);
    return;
  }

  if (mode === 'lookbook-vinted') {
    renderLookbookWithInventoryBoard(ctx, img, size, options, preset);
    return;
  }

  if (mode === 'daylight-natural') {
    drawStudioBackdrop(ctx, size, preset.hex, preset.innerHex, options.backgroundPreset);
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const scale = Math.min(size / srcW, size / srcH);
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    const offsetX = Math.round((size - drawW) / 2);
    const offsetY = Math.round((size - drawH) / 2);

    const off = document.createElement('canvas');
    off.width = drawW;
    off.height = drawH;
    const offCtx = off.getContext('2d', { willReadFrequently: true });
    if (offCtx) {
      offCtx.drawImage(img, 0, 0, srcW, srcH, 0, 0, drawW, drawH);
      const imgData = offCtx.getImageData(0, 0, drawW, drawH);
      applyOpticalStudioLighting(imgData, options.detourageStrength);
      offCtx.putImageData(imgData, 0, 0);
    }
    ctx.drawImage(off, offsetX, offsetY, drawW, drawH);
    stampCornerOrBottomBadge(ctx, size, options);
    return;
  }

  // Default Mode ('studio-pro'):
  // Dedicated Top Vinted Boutique Header Bar (so badges NEVER overlap the garments!)
  // + Optical Studio Softbox Lighting & Textile Clarity (zero blotchy pixel replacement!)
  drawStudioBackdrop(ctx, size, preset.hex, preset.innerHex, options.backgroundPreset);

  const topContentY = drawTopVintedHeaderBar(ctx, size, options);
  const padSide = Math.round(size * 0.032);
  const bottomReserve = Math.round(size * 0.052);

  const availW = size - padSide * 2;
  const availH = size - topContentY - bottomReserve;

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const aspect = srcW / Math.max(1, srcH);

  let drawW = availW;
  let drawH = Math.round(availW / aspect);
  if (drawH > availH) {
    drawH = availH;
    drawW = Math.round(availH * aspect);
  }

  const offsetX = Math.round((size - drawW) / 2);
  const offsetY = topContentY + Math.round((availH - drawH) / 2);

  const off = document.createElement('canvas');
  off.width = drawW;
  off.height = drawH;
  const offCtx = off.getContext('2d', { willReadFrequently: true });
  if (offCtx) {
    offCtx.drawImage(img, 0, 0, srcW, srcH, 0, 0, drawW, drawH);
    const imgData = offCtx.getImageData(0, 0, drawW, drawH);
    applyOpticalStudioLighting(imgData, options.detourageStrength);
    offCtx.putImageData(imgData, 0, 0);
  }

  const radius = Math.round(size * 0.02);
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.09)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  drawRoundedRect(ctx, offsetX, offsetY, drawW, drawH, radius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, offsetX, offsetY, drawW, drawH, radius);
  ctx.clip();
  ctx.drawImage(off, offsetX, offsetY, drawW, drawH);
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, offsetX, offsetY, drawW, drawH, radius);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = preset.borderHex;
  ctx.stroke();
  ctx.restore();

  drawBottomTrustStrip(ctx, size, options.condition);
}

function stampCornerOrBottomBadge(
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
          border: 'rgba(255, 255, 255, 0.22)',
          textMain: '#FFFFFF',
          textSub: '#CBD5E1',
          accent: '#2DD4BF',
        }
      : options.badgeStyle === 'teal-vinted'
        ? {
            bg: 'rgba(13, 148, 136, 0.95)',
            border: 'rgba(255, 255, 255, 0.3)',
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
    const barH = Math.round(size * 0.11);
    const barY = size - barH - Math.round(size * 0.022);
    const barX = pad;
    const barW = size - pad * 2;

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
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
    ctx.font = `700 ${Math.round(size * 0.03)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(
      brandSubtitle || 'DRESSING ENFANT',
      barX + Math.round(size * 0.03),
      barY + barH * 0.4
    );

    ctx.fillStyle = palette.textSub;
    ctx.font = `500 ${Math.round(size * 0.021)}px "DM Sans", sans-serif`;
    ctx.fillText(
      `${options.condition || 'Très bon état'} · Taille ${cmSubtitle} · Maison non-fumeur`,
      barX + Math.round(size * 0.03),
      barY + barH * 0.74
    );

    ctx.fillStyle = palette.accent;
    ctx.font = `700 ${Math.round(size * 0.036)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(ageHeadline, barX + barW - Math.round(size * 0.03), barY + barH * 0.54);
  } else {
    ctx.font = `700 ${Math.round(size * 0.035)}px "Plus Jakarta Sans", sans-serif`;
    const ageWidth = ctx.measureText(ageHeadline).width;

    const subLine = brandSubtitle
      ? `TAILLE ${cmSubtitle.toUpperCase()} · ${brandSubtitle}`
      : `TAILLE ${cmSubtitle.toUpperCase()}`;
    ctx.font = `600 ${Math.round(size * 0.0185)}px "DM Sans", sans-serif`;
    const subWidth = ctx.measureText(subLine).width;

    const cardW = Math.min(size - pad * 2, Math.max(ageWidth, subWidth) + Math.round(size * 0.052));
    const cardH = Math.round(size * 0.104);

    const cardX = options.badgePosition === 'top-left' ? pad : size - cardW - pad;
    const cardY =
      options.badgePosition === 'bottom-right'
        ? size - cardH - Math.round(size * 0.058)
        : pad;

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, Math.round(size * 0.018));
    ctx.fillStyle = palette.bg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.border;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = palette.textMain;
    ctx.font = `700 ${Math.round(size * 0.035)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ageHeadline, cardX + cardW / 2, cardY + cardH * 0.43);

    ctx.fillStyle = palette.textSub;
    ctx.font = `600 ${Math.round(size * 0.0185)}px "DM Sans", sans-serif`;
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

  renderSubjectByMode(ctx, img, size, options, preset);

  ctx.strokeStyle = preset.borderHex;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  return canvas.toDataURL('image/jpeg', 0.93);
}

/**
 * Stitches 2 to 10 individual garment photos into a single numbered Global Bundle Photo (#1 to #N)
 * with full Optical Studio Softbox & Textile Clarity enhancement and the Vinted header bar on top.
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

  drawStudioBackdrop(ctx, size, preset.hex, preset.innerHex, options.backgroundPreset);

  const topReserve = drawTopVintedHeaderBar(ctx, size, {
    ...options,
    imageSrc: '',
    bundleCount: count,
  });
  const bottomReserve = Math.round(size * 0.052);

  const cols = count <= 4 ? 2 : count <= 6 ? 3 : count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / cols);

  const outerPad = Math.round(size * 0.032);
  const gap = Math.round(size * 0.016);
  const availW = size - outerPad * 2 - gap * (cols - 1);
  const availH = size - topReserve - bottomReserve - gap * (rows - 1);
  const cellW = Math.floor(availW / cols);
  const cellH = Math.floor(availH / rows);

  imgs.forEach((img, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = outerPad + col * (cellW + gap);
    const y = topReserve + row * (cellH + gap);

    const scale = Math.min(cellW / img.naturalWidth, cellH / img.naturalHeight) * 0.94;
    const dw = Math.max(1, Math.round(img.naturalWidth * scale));
    const dh = Math.max(1, Math.round(img.naturalHeight * scale));

    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = dw;
    cellCanvas.height = dh;
    const cellCtx = cellCanvas.getContext('2d', { willReadFrequently: true });
    if (cellCtx) {
      cellCtx.drawImage(img, 0, 0, dw, dh);
      const cellData = cellCtx.getImageData(0, 0, dw, dh);
      applyOpticalStudioLighting(cellData, 70);
      cellCtx.putImageData(cellData, 0, 0);
    }

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    drawRoundedRect(ctx, x, y, cellW, cellH, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, x, y, cellW, cellH, 16);
    ctx.strokeStyle = preset.borderHex;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.clip();

    ctx.drawImage(cellCanvas, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);

    const numBadgeSize = Math.round(size * 0.036);
    drawRoundedRect(ctx, x + 10, y + 10, numBadgeSize * 1.35, numBadgeSize, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fill();
    ctx.fillStyle = '#2DD4BF';
    ctx.font = `700 ${Math.round(size * 0.02)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${idx + 1}`, x + 10 + (numBadgeSize * 1.35) / 2, y + 10 + numBadgeSize / 2);
    ctx.restore();
  });

  drawBottomTrustStrip(ctx, size, options.condition);

  return canvas.toDataURL('image/jpeg', 0.93);
}
