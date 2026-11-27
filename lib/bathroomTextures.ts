import * as THREE from 'three';
import type { CharacterTextureAsset } from './galleryData';

export interface BathroomTileMaps {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Generates seamless glossy dark-indigo ceramic bathroom wall/floor tile PBR textures
 * with recessed grout lines, subtle bevels, and humid water-droplet roughness variation.
 */
export function createBathroomTileMaps(
  maxAnisotropy: number,
  variant: 'wall' | 'floor'
): BathroomTileMaps {
  const size = 512;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  // Grout base
  aCtx.fillStyle = variant === 'wall' ? '#121024' : '#0f0d1c';
  aCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#242424';
  bCtx.fillRect(0, 0, size, size);

  // Grout is matte (high roughness = light value)
  rCtx.fillStyle = '#cfcfcf';
  rCtx.fillRect(0, 0, size, size);

  const cols = variant === 'wall' ? 4 : 4;
  const rows = variant === 'wall' ? 8 : 4;
  const tileW = size / cols;
  const tileH = size / rows;
  const grout = variant === 'wall' ? 4 : 5;

  // Deterministic pseudo-random helper
  let seed = variant === 'wall' ? 1337 : 9001;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    const offset = variant === 'wall' && r % 2 === 1 ? tileW * 0.5 : 0;
    for (let c = -1; c <= cols; c++) {
      const x = c * tileW + offset + grout * 0.5;
      const y = r * tileH + grout * 0.5;
      const w = tileW - grout;
      const h = tileH - grout;

      const shade = rand();
      const baseR = variant === 'wall' ? 28 + Math.floor(shade * 14) : 22 + Math.floor(shade * 12);
      const baseG = variant === 'wall' ? 26 + Math.floor(shade * 16) : 24 + Math.floor(shade * 14);
      const baseB = variant === 'wall' ? 50 + Math.floor(shade * 22) : 42 + Math.floor(shade * 18);

      const grad = aCtx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, `rgb(${baseR + 10}, ${baseG + 12}, ${baseB + 16})`);
      grad.addColorStop(0.55, `rgb(${baseR}, ${baseG}, ${baseB})`);
      grad.addColorStop(1, `rgb(${Math.max(10, baseR - 8)}, ${Math.max(10, baseG - 8)}, ${Math.max(18, baseB - 10)})`);
      aCtx.fillStyle = grad;
      aCtx.fillRect(x, y, w, h);

      // Subtle glossy ceramic edge bevel highlight
      aCtx.strokeStyle = 'rgba(130, 170, 230, 0.09)';
      aCtx.lineWidth = 1.5;
      aCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);

      // Bump: raised tile face with slight chamfer
      bCtx.fillStyle = '#dcdcdc';
      bCtx.fillRect(x + 2, y + 2, w - 4, h - 4);
      bCtx.strokeStyle = '#929292';
      bCtx.lineWidth = 2;
      bCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);

      // Roughness: glossy wet glaze (dark values = low roughness ~0.12 - 0.24)
      const roughVal = Math.floor((variant === 'wall' ? 30 : 38) + rand() * 24);
      rCtx.fillStyle = `rgb(${roughVal}, ${roughVal}, ${roughVal})`;
      rCtx.fillRect(x + 1, y + 1, w - 2, h - 2);
    }
  }

  // Subtle condensation streaks / dampness variation on roughness map
  for (let i = 0; i < 42; i++) {
    const sx = rand() * size;
    const sy = rand() * size;
    const sh = 24 + rand() * 88;
    const sw = 2 + rand() * 5;
    rCtx.fillStyle = 'rgba(14, 14, 14, 0.32)';
    rCtx.fillRect(sx, sy, sw, sh);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAnisotropy;

  return {
    map,
    bumpMap,
    roughnessMap,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
    },
  };
}

/**
 * Generates a tileable fabric micro-weave bump texture for the shower curtain.
 */
export function createFabricWeaveBumpMap(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
    ctx.fillRect(0, y, size, 2);
  }
  for (let x = 0; x < size; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, 0, 2, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 11);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a soft circular radial sprite texture for rising humid bathroom steam particles.
 */
export function createSteamParticleTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 240, 255, 0.34)');
  grad.addColorStop(0.45, 'rgba(190, 225, 255, 0.14)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface CurtainRenderOptions {
  character: CharacterTextureAsset;
  image: HTMLImageElement | null;
  glitchEnergy: number;
  touchU: number;
  touchV: number;
  time: number;
}

/**
 * Renders the high-resolution GTA VI shower curtain graphic onto an HTML5 Canvas:
 * - High-res character artwork
 * - Top shower-curtain stitched header & brass/chrome grommet eyelets
 * - Simulated GTA VI Vice City logo ("VI" + palm sunset gradient + cursive "Powered by Canvas UI")
 * - Interactive touch-reactive RGB split, horizontal slice glitches, scanlines, and classic HUD marks
 */
export function renderCurtainCanvas(
  canvas: HTMLCanvasElement,
  scratchCanvas: HTMLCanvasElement,
  opts: CurtainRenderOptions
): void {
  const ctx = canvas.getContext('2d');
  const sCtx = scratchCanvas.getContext('2d');
  if (!ctx || !sCtx) return;

  const w = canvas.width;
  const h = canvas.height;
  const { character, image, glitchEnergy, touchU, touchV, time } = opts;

  // 1. Draw base composition into scratchCanvas first so glitch slicing can sample cleanly
  sCtx.clearRect(0, 0, w, h);

  // Fallback neon gradient backdrop before image finishes decoding
  const fallbackGrad = sCtx.createLinearGradient(0, 0, w, h);
  fallbackGrad.addColorStop(0, '#1e1036');
  fallbackGrad.addColorStop(0.5, '#3b154d');
  fallbackGrad.addColorStop(1, '#0e283b');
  sCtx.fillStyle = fallbackGrad;
  sCtx.fillRect(0, 0, w, h);

  // Draw character artwork covering curtain cleanly
  if (image && image.complete && image.naturalWidth > 0) {
    const imgAspect = image.naturalWidth / image.naturalHeight;
    const canvasAspect = w / h;
    let drawW = w;
    let drawH = h;
    let drawX = 0;
    let drawY = 0;
    if (imgAspect > canvasAspect) {
      drawH = h;
      drawW = h * imgAspect;
      drawX = (w - drawW) * 0.5;
    } else {
      drawW = w;
      drawH = w / imgAspect;
      drawY = (h - drawH) * 0.25;
    }
    sCtx.drawImage(image, drawX, drawY, drawW, drawH);
  }

  // Subtle top & bottom gradient scrims so grommets & GTA VI Vice City logo pop with razor legibility
  const topScrim = sCtx.createLinearGradient(0, 0, 0, h * 0.16);
  topScrim.addColorStop(0, 'rgba(9, 6, 18, 0.72)');
  topScrim.addColorStop(1, 'rgba(9, 6, 18, 0)');
  sCtx.fillStyle = topScrim;
  sCtx.fillRect(0, 0, w, h * 0.16);

  const bottomScrim = sCtx.createLinearGradient(0, h * 0.52, 0, h);
  bottomScrim.addColorStop(0, 'rgba(10, 6, 22, 0)');
  bottomScrim.addColorStop(0.55, 'rgba(12, 6, 26, 0.52)');
  bottomScrim.addColorStop(1, 'rgba(9, 5, 20, 0.88)');
  sCtx.fillStyle = bottomScrim;
  sCtx.fillRect(0, h * 0.52, w, h * 0.48);

  // Shower curtain stitched header band & metal grommet eyelets
  const headerH = h * 0.055;
  sCtx.fillStyle = 'rgba(18, 13, 30, 0.72)';
  sCtx.fillRect(0, 0, w, headerH);
  sCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  sCtx.lineWidth = Math.max(1.5, w * 0.002);
  sCtx.setLineDash([w * 0.012, w * 0.008]);
  sCtx.beginPath();
  sCtx.moveTo(0, headerH);
  sCtx.lineTo(w, headerH);
  sCtx.stroke();
  sCtx.setLineDash([]);

  const grommetCount = 15;
  for (let i = 0; i < grommetCount; i++) {
    const gx = (i / (grommetCount - 1)) * (w - w * 0.06) + w * 0.03;
    const gy = headerH * 0.5;
    const gr = w * 0.013;
    sCtx.beginPath();
    sCtx.arc(gx, gy, gr, 0, Math.PI * 2);
    sCtx.fillStyle = '#090710';
    sCtx.fill();
    sCtx.lineWidth = Math.max(2, w * 0.004);
    sCtx.strokeStyle = '#d9e3f0';
    sCtx.stroke();
  }

  // Subtle Vice City corner HUD marks baked onto the curtain fabric (brighten when touched)
  const hudBoost = Math.min(1, glitchEnergy * 1.15);
  sCtx.save();
  sCtx.font = `700 ${Math.round(w * 0.025)}px "JetBrains Mono", monospace`;
  sCtx.fillStyle = `rgba(46, 231, 255, ${0.58 + hudBoost * 0.42})`;
  sCtx.textAlign = 'left';
  sCtx.fillText(`FILE // ${character.codename} · ${character.name.toUpperCase()}`, w * 0.045, headerH + h * 0.042);

  sCtx.textAlign = 'right';
  sCtx.fillStyle = `rgba(255, 79, 216, ${0.65 + hudBoost * 0.35})`;
  sCtx.fillText(character.district, w * 0.955, headerH + h * 0.042);
  sCtx.restore();

  // Simulated GTA VI Vice City Logo Lockup (lower-center hero placement)
  drawViceSimulatedLogo(sCtx, w, h, glitchEnergy, time);

  // Subtle fabric hem trim along left, right, bottom
  sCtx.strokeStyle = 'rgba(255, 79, 216, 0.24)';
  sCtx.lineWidth = w * 0.008;
  sCtx.strokeRect(w * 0.004, headerH, w - w * 0.008, h - headerH - w * 0.004);

  // 2. Copy base to output canvas & apply live interactive glitch pass when touched/dragged
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(scratchCanvas, 0, 0);

  if (glitchEnergy > 0.02) {
    const g = Math.min(1.25, glitchEnergy);

    // Chromatic RGB horizontal channel offsets
    const shift = Math.round(w * 0.022 * g * (0.65 + 0.35 * Math.sin(time * 47)));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.26 * g;
    ctx.drawImage(scratchCanvas, shift, 0);
    ctx.fillStyle = '#ff2bc2';
    ctx.globalCompositeOperation = 'source-atop';
    ctx.restore();

    // Horizontal glitch tear slices concentrated around touchV and logo band
    const sliceCount = Math.floor(6 + g * 14);
    for (let i = 0; i < sliceCount; i++) {
      const seed = Math.sin(i * 91.7 + Math.floor(time * 24) * 13.3);
      const pseudo = seed - Math.floor(seed);
      const nearTouch = i % 2 === 0;
      const yFrac = nearTouch
        ? Math.max(0.06, Math.min(0.94, touchV + (pseudo - 0.5) * 0.38))
        : 0.08 + pseudo * 0.84;
      const sy = Math.floor(yFrac * h);
      const sh = Math.max(4, Math.floor((0.008 + pseudo * 0.032) * h * g));
      const dx = Math.round((Math.sin(i * 37.1 + time * 60) * 0.055 * w) * g);

      ctx.drawImage(scratchCanvas, 0, sy, w, sh, dx, sy, w, sh);

      // Neon cyan or hot magenta signal edge strip
      ctx.fillStyle =
        i % 2 === 0
          ? `rgba(46, 231, 255, ${0.28 * g})`
          : `rgba(255, 54, 184, ${0.28 * g})`;
      ctx.fillRect(0, sy, w, Math.max(2, sh * 0.22));
    }

    // Touch impact holographic reticle ripple on the fabric itself
    const tx = touchU * w;
    const ty = touchV * h;
    const ringR = w * (0.045 + (1 - Math.min(1, g)) * 0.09);
    ctx.save();
    ctx.strokeStyle = `rgba(46, 231, 255, ${0.72 * g})`;
    ctx.lineWidth = Math.max(2, w * 0.0035);
    ctx.beginPath();
    ctx.arc(tx, ty, ringR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 79, 216, ${0.65 * g})`;
    ctx.beginPath();
    ctx.arc(tx + shift * 0.4, ty, ringR * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Subtle CRT scanlines across curtain during active glitch
    ctx.fillStyle = `rgba(12, 8, 26, ${0.18 * g})`;
    for (let y = 0; y < h; y += 6) {
      ctx.fillRect(0, y, w, 2);
    }

    // Classic GTA HUD alert strip flaring at top-center of curtain when touched
    ctx.save();
    const bannerY = headerH + h * 0.078;
    const bannerW = w * 0.54;
    const bannerH = h * 0.042;
    const bannerX = (w - bannerW) * 0.5 + Math.sin(time * 55) * 4 * g;
    ctx.fillStyle = `rgba(14, 7, 28, ${0.84 * Math.min(1, g * 1.4)})`;
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    ctx.strokeStyle = `rgba(46, 231, 255, ${0.9 * Math.min(1, g * 1.3)})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

    ctx.font = `700 ${Math.round(w * 0.024)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#2ee7ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VICE HUD // CLOTH SIGNAL GLITCH', w * 0.5, bannerY + bannerH * 0.52);
    ctx.restore();
  }
}

function drawViceSimulatedLogo(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  glitchEnergy: number,
  time: number
): void {
  const cx = w * 0.5;
  const logoCenterY = h * 0.79;
  const g = Math.min(1.2, glitchEnergy);
  const jitterX = g > 0.04 ? Math.sin(time * 68) * w * 0.014 * g : 0;
  const jitterY = g > 0.04 ? Math.cos(time * 53) * h * 0.004 * g : 0;

  ctx.save();
  ctx.translate(cx + jitterX, logoCenterY + jitterY);

  // Subtle Vice sunset palm-horizon halo behind the VI emblem
  const haloR = w * 0.28;
  const haloGrad = ctx.createRadialGradient(0, -h * 0.015, haloR * 0.1, 0, -h * 0.015, haloR);
  haloGrad.addColorStop(0, `rgba(255, 79, 216, ${0.34 + g * 0.25})`);
  haloGrad.addColorStop(0.55, `rgba(46, 231, 255, ${0.14 + g * 0.18})`);
  haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, -h * 0.015, haloR, 0, Math.PI * 2);
  ctx.fill();

  // Giant bold condensed Roman numeral "VI"
  const viSize = Math.round(w * 0.28);
  ctx.font = `700 ${viSize}px "Oswald", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Chromatic ghost echoes when touched
  if (g > 0.04) {
    ctx.fillStyle = `rgba(46, 231, 255, ${0.65 * g})`;
    ctx.fillText('VI', -w * 0.018 * g, -h * 0.028);
    ctx.fillStyle = `rgba(255, 54, 184, ${0.65 * g})`;
    ctx.fillText('VI', w * 0.018 * g, -h * 0.022);
  }

  // Sunset palm gradient fill for "VI"
  const viGrad = ctx.createLinearGradient(0, -viSize * 0.55, 0, viSize * 0.45);
  viGrad.addColorStop(0, '#ffca6b');
  viGrad.addColorStop(0.32, '#ff6a88');
  viGrad.addColorStop(0.68, '#d938c7');
  viGrad.addColorStop(1, '#5856f2');

  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(5, w * 0.013);
  ctx.strokeStyle = 'rgba(10, 6, 22, 0.92)';
  ctx.strokeText('VI', 0, -h * 0.025);

  ctx.fillStyle = viGrad;
  ctx.fillText('VI', 0, -h * 0.025);

  // Crisp inner white rim highlight
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.strokeText('VI', 0, -h * 0.025);

  // Upper micro-label "VICE CITY VIRTUAL GALLERY" cleanly separated above VI
  ctx.font = `700 ${Math.round(w * 0.027)}px "Oswald", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(10, 6, 22, 0.96)';
  ctx.lineWidth = Math.max(4, w * 0.007);
  const topLabel = 'VICE CITY VIRTUAL GALLERY';
  ctx.strokeText(topLabel, 0, -viSize * 0.64);
  ctx.fillText(topLabel, 0, -viSize * 0.64);

  // Signature Vice City cursive neon script overlay: "Powered by Canvas UI"
  const scriptSize = Math.round(w * 0.088);
  ctx.save();
  ctx.rotate(-0.04);
  ctx.font = `400 ${scriptSize}px "Yellowtail", "Brush Script MT", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Electric cyan shadow offset (classic Vice City neon double-stroke)
  ctx.fillStyle = '#2ee7ff';
  ctx.fillText('Powered by Canvas UI', 4 + g * 5, h * 0.044 + 4);

  // Deep dark outline for legibility against bright artwork
  ctx.strokeStyle = '#12051f';
  ctx.lineWidth = Math.max(6, w * 0.012);
  ctx.strokeText('Powered by Canvas UI', 0, h * 0.044);

  // Hot neon pink/magenta main script fill
  const scriptGrad = ctx.createLinearGradient(-w * 0.34, 0, w * 0.34, 0);
  scriptGrad.addColorStop(0, '#ff87e5');
  scriptGrad.addColorStop(0.5, '#ff35be');
  scriptGrad.addColorStop(1, '#ff9ce8');
  ctx.fillStyle = scriptGrad;
  ctx.fillText('Powered by Canvas UI', 0, h * 0.044);

  // Crisp hot specular core when touched
  if (g > 0.05) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.42 * g})`;
    ctx.fillText('Powered by Canvas UI', -2 * g, h * 0.042);
  }
  ctx.restore();

  // Bottom HUD telemetry underline bar inside logo lockup
  const barY = h * 0.128;
  const barW = w * 0.62;
  ctx.fillStyle = 'rgba(10, 6, 22, 0.8)';
  ctx.fillRect(-barW * 0.5, barY - 15, barW, 30);
  ctx.fillStyle = g > 0.08 ? '#2ee7ff' : '#ff4fd8';
  ctx.fillRect(-barW * 0.5, barY - 15, 5, 30);
  ctx.fillRect(barW * 0.5 - 5, barY - 15, 5, 30);

  ctx.font = `600 ${Math.round(w * 0.021)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#f8f2ff';
  ctx.fillText(
    g > 0.08 ? 'SIGNAL GLITCH ACTIVE · TOUCH INTERACTION' : 'DRAG OR BRUSH CURTAIN · INTERACTIVE CLOTH',
    0,
    barY + 1
  );

  ctx.restore();
}
