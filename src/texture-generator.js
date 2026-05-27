/**
 * Procedural Texture Generator
 * Uses Canvas2D to generate PBR textures at runtime
 */
import * as THREE from 'three';

function createCanvas(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function makeTexture(canvas, repeat = true) {
  const tex = new THREE.CanvasTexture(canvas);
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function valueNoise(x, y, seed = 42) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const hash = (ix, iy) => {
    const n = ix * 374761393 + iy * 668265263 + seed;
    const h = (n ^ (n >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
  };

  const v00 = hash(xi, yi);
  const v10 = hash(xi + 1, yi);
  const v01 = hash(xi, yi + 1);
  const v11 = hash(xi + 1, yi + 1);

  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);

  const a = v00 + sx * (v10 - v00);
  const b = v01 + sx * (v11 - v01);
  return a + sy * (b - a);
}

function fbm(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5, seed = 42) {
  let value = 0;
  let amplitude = 1.0;
  let frequency = 1.0;
  let maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise(x * frequency, y * frequency, seed + i * 100);
    maxVal += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / maxVal;
}

/**
 * Generate a normal map from a canvas (treating brightness as height)
 */
export function generateNormalFromCanvas(sourceCanvas, strength = 2) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const getHeight = (px, py) => {
    const cx = ((px % w) + w) % w;
    const cy = ((py % h) + h) % h;
    const idx = (cy * w + cx) * 4;
    return (srcData[idx] * 0.3 + srcData[idx + 1] * 0.59 + srcData[idx + 2] * 0.11) / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const left = getHeight(x - 1, y);
      const right = getHeight(x + 1, y);
      const up = getHeight(x, y - 1);
      const down = getHeight(x, y + 1);

      const nx = (left - right) * strength;
      const ny = (up - down) * strength;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const idx = (y * w + x) * 4;
      data[idx] = Math.floor((nx / len * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny / len * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz / len * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * WOOD GRAIN TEXTURE
 */
export function generateWoodTexture(size = 512) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Base warm wood color
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      // Wood ring pattern
      const distortion = fbm(nx * 4, ny * 4, 3, 2.0, 0.5, 10) * 0.3;
      const ring = Math.sin((nx + distortion) * 12 * Math.PI * 2) * 0.5 + 0.5;

      // Fine grain lines (horizontal emphasis)
      const fineGrain = fbm(nx * 40, ny * 2, 2, 2.0, 0.5, 20) * 0.15;

      // Overall noise variation
      const noise = fbm(nx * 8, ny * 8, 4, 2.0, 0.5, 30) * 0.2;

      const t = ring * 0.6 + fineGrain + noise;
      const clamped = Math.max(0, Math.min(1, t));

      const idx = (y * size + x) * 4;
      data[idx] = Math.floor(160 + (110 - 160) * clamped);
      data[idx + 1] = Math.floor(110 + (70 - 110) * clamped);
      data[idx + 2] = Math.floor(60 + (35 - 60) * clamped);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Horizontal streaks for grain
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 80; i++) {
    const yPos = Math.random() * size;
    ctx.strokeStyle = Math.random() > 0.5 ? '#2a1a0a' : '#c8a060';
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, yPos);
    for (let sx = 0; sx < size; sx += 20) {
      const yOff = yPos + Math.sin(sx * 0.01 + Math.random() * 5) * (3 + Math.random() * 5);
      ctx.lineTo(sx, yOff);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Add knots
  for (let i = 0; i < 4; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = 10 + Math.random() * 25;
    for (let j = 0; j < r; j += 2) {
      ctx.strokeStyle = `rgba(60, 30, 0, ${0.02 + Math.random() * 0.05})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, j * 1.5, j, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const map = makeTexture(canvas);
  const normalMap = generateNormalFromCanvas(canvas, 1.5);
  return { map, normalMap };
}

/**
 * FABRIC / CLOTH TEXTURE
 */
export function generateFabricTexture(color = '#7B4B94', size = 256) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const cr = parseInt(color.slice(1, 3), 16);
  const cg = parseInt(color.slice(3, 5), 16);
  const cb = parseInt(color.slice(5, 7), 16);

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  const threadSize = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Woven pattern
      const gx = Math.floor(x / threadSize) % 2;
      const gy = Math.floor(y / threadSize) % 2;
      const weave = (gx + gy) % 2;

      const tx = x % threadSize;
      const ty = y % threadSize;
      const edgeFactor = (tx === 0 || ty === 0) ? -12 : 0;
      const depth = weave ? 8 : -8;
      const noise = (Math.random() - 0.5) * 10;

      data[idx] = Math.max(0, Math.min(255, cr + depth + edgeFactor + noise));
      data[idx + 1] = Math.max(0, Math.min(255, cg + depth + edgeFactor + noise));
      data[idx + 2] = Math.max(0, Math.min(255, cb + depth + edgeFactor + noise));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Thread lines
  ctx.strokeStyle = 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // Fuzz
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'white' : 'black';
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  ctx.globalAlpha = 1.0;

  const map = makeTexture(canvas);
  const normalMap = generateNormalFromCanvas(canvas, 1.0);
  return { map, normalMap };
}

/**
 * CERAMIC / PORCELAIN TEXTURE
 */
export function generateCeramicTexture(size = 512) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Smooth glazy surface
  const grad = ctx.createRadialGradient(size / 2, size / 2, 50, size / 2, size / 2, size * 0.7);
  grad.addColorStop(0, '#F5F0E8');
  grad.addColorStop(0.5, '#EDE5D8');
  grad.addColorStop(1, '#DDD5C5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle imperfections / speckles
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = 0.5 + Math.random() * 2;
    ctx.fillStyle = `rgba(180, 160, 130, ${0.08 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glaze sheen highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(size * 0.35, size * 0.35, size * 0.25, size * 0.16, -0.5, 0, Math.PI * 1.2);
  ctx.fill();

  // Subtle color variation
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;
      const variation = fbm(nx * 3, ny * 3, 3, 2.0, 0.5, 55) * 8;
      data[idx] = Math.max(0, Math.min(255, data[idx] + variation));
      data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + variation));
      data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + variation * 0.5));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const map = makeTexture(canvas, false);
  const normalMap = generateNormalFromCanvas(canvas, 0.5);
  return { map, normalMap };
}

/**
 * STONE / ROCK TEXTURE
 */
export function generateStoneTexture(size = 512) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#7A7A7A';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      const idx = (y * size + x) * 4;

      // Multi-octave noise for stone surface
      const n1 = fbm(nx * 6, ny * 6, 6, 2.0, 0.5, 100);
      const n2 = fbm(nx * 12, ny * 12, 4, 2.0, 0.5, 200) * 0.3;
      const n3 = fbm(nx * 24, ny * 24, 3, 2.0, 0.5, 300) * 0.1;
      const combined = n1 + n2 + n3;

      const baseGray = 100 + combined * 80;
      const warm = fbm(nx * 4, ny * 4, 2, 2.0, 0.5, 400) * 15;

      data[idx] = Math.max(0, Math.min(255, baseGray + warm));
      data[idx + 1] = Math.max(0, Math.min(255, baseGray + warm * 0.5));
      data[idx + 2] = Math.max(0, Math.min(255, baseGray - warm * 0.3));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Crack lines
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#2a2a2a';
  for (let i = 0; i < 12; i++) {
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    let px = Math.random() * size;
    let py = Math.random() * size;
    ctx.moveTo(px, py);
    for (let j = 0; j < 6; j++) {
      px += (Math.random() - 0.5) * 80;
      py += (Math.random() - 0.5) * 80;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  const map = makeTexture(canvas);
  const normalMap = generateNormalFromCanvas(canvas, 3.0);
  return { map, normalMap };
}

/**
 * METAL TEXTURE
 */
export function generateMetalTexture(size = 512) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Brushed metal gradient
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#C0C0C0');
  grad.addColorStop(0.3, '#D8D8D8');
  grad.addColorStop(0.5, '#A8A8A8');
  grad.addColorStop(0.7, '#D0D0D0');
  grad.addColorStop(1, '#B0B0B0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Brush lines (horizontal)
  for (let y = 0; y < size; y += 1) {
    const alpha = 0.01 + Math.random() * 0.04;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random());
    ctx.lineTo(size, y + Math.random());
    ctx.stroke();
  }

  // Subtle darker brush lines
  for (let y = 0; y < size; y += 2) {
    const alpha = 0.005 + Math.random() * 0.02;
    ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random() * 2);
    ctx.lineTo(size, y + Math.random() * 2);
    ctx.stroke();
  }

  const map = makeTexture(canvas);
  const normalMap = generateNormalFromCanvas(canvas, 1.0);
  return { map, normalMap };
}

/**
 * LEAF / FOLIAGE TEXTURE
 */
export function generateLeafTexture(size = 256) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2D8B2D';
  ctx.fillRect(0, 0, size, size);

  // Per-pixel noise for organic feel
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      const idx = (y * size + x) * 4;

      const n1 = fbm(nx * 8, ny * 8, 4, 2.0, 0.5, 800);
      const n2 = fbm(nx * 16, ny * 16, 3, 2.0, 0.5, 900) * 0.3;
      const greenBase = 0.4 + n1 * 0.3 + n2;

      const noise = (Math.random() - 0.5) * 20;
      data[idx] = Math.max(0, Math.min(255, 35 + n1 * 30 + noise * 0.5));
      data[idx + 1] = Math.max(0, Math.min(255, 100 + greenBase * 80 + noise));
      data[idx + 2] = Math.max(0, Math.min(255, 30 + n1 * 20 + noise * 0.5));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Leaf veins
  ctx.strokeStyle = 'rgba(20, 80, 20, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size / 2, size);
  ctx.lineTo(size / 2, 0);
  ctx.stroke();

  for (let y = 30; y < size - 20; y += 25) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(20, 80, 20, 0.25)';
    ctx.beginPath();
    ctx.moveTo(size / 2, y);
    ctx.quadraticCurveTo(size / 2 + 60, y - 10, size / 2 + 80, y - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size / 2, y);
    ctx.quadraticCurveTo(size / 2 - 60, y - 10, size / 2 - 80, y - 20);
    ctx.stroke();
  }

  const map = makeTexture(canvas);
  const normalMap = generateNormalFromCanvas(canvas, 1.5);
  return { map, normalMap };
}

/**
 * GRID / TECH TEXTURE
 */
export function generateTechTexture(size = 512) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(0, 0, size, size);

  const gridSize = 32;

  // Base grid
  ctx.strokeStyle = 'rgba(0, 255, 200, 0.08)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= size; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
  }
  for (let y = 0; y <= size; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }

  // Accent major grid lines
  ctx.strokeStyle = 'rgba(0, 210, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= size; x += gridSize * 4) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
  }
  for (let y = 0; y <= size; y += gridSize * 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }

  // Filled rectangles (chip-like blocks)
  const rng = seededRandom(42);
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rng() * 16) * gridSize;
    const y = Math.floor(rng() * 16) * gridSize;
    const w = (1 + Math.floor(rng() * 3)) * gridSize;
    const h = (1 + Math.floor(rng() * 2)) * gridSize;
    ctx.fillStyle = `rgba(0, 255, 200, ${0.03 + rng() * 0.05})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = `rgba(0, 255, 200, ${0.1 + rng() * 0.1})`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
  }

  // Glowing nodes
  for (let i = 0; i < 15; i++) {
    const nx = Math.floor(rng() * 16) * gridSize + gridSize / 2;
    const ny = Math.floor(rng() * 16) * gridSize + gridSize / 2;
    const gradient = ctx.createRadialGradient(nx, ny, 0, nx, ny, gridSize * 0.5);
    gradient.addColorStop(0, 'rgba(0, 255, 200, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 255, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(nx, ny, gridSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Dot
    ctx.fillStyle = 'rgba(0, 255, 200, 0.4)';
    ctx.beginPath();
    ctx.arc(nx, ny, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Circuit traces
  ctx.strokeStyle = 'rgba(233, 69, 96, 0.15)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 20; i++) {
    const x1 = Math.floor(rng() * 16) * gridSize + gridSize / 2;
    const y1 = Math.floor(rng() * 16) * gridSize + gridSize / 2;
    const horizontal = rng() > 0.5;
    const length = (2 + Math.floor(rng() * 4)) * gridSize;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    if (horizontal) ctx.lineTo(x1 + length, y1);
    else ctx.lineTo(x1, y1 + length);
    ctx.stroke();
  }

  const map = makeTexture(canvas);
  const normalMap = generateNormalFromCanvas(canvas, 0.5);
  return { map, normalMap };
}

/**
 * PAINTING / CANVAS ART TEXTURE
 * Abstract art for painting frame
 */
export function generatePaintingTexture(size = 512) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Canvas background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#1a0533');
  grad.addColorStop(0.3, '#2d1b69');
  grad.addColorStop(0.5, '#11998e');
  grad.addColorStop(0.7, '#38ef7d');
  grad.addColorStop(1, '#ffd700');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Color blobs
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ff6b81'];
  const rng = seededRandom(12345);

  for (let i = 0; i < 50; i++) {
    const cx = rng() * size;
    const cy = rng() * size;
    const r = 20 + rng() * 80;
    const hue = rng() * 360;
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    radGrad.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.15)`);
    radGrad.addColorStop(1, `hsla(${hue}, 80%, 40%, 0)`);
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bold shapes
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    const shapeType = Math.floor(rng() * 3);
    const cx = rng() * size;
    const cy = rng() * size;
    const s = 30 + rng() * 100;

    if (shapeType === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, s / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (shapeType === 1) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rng() * Math.PI);
      ctx.fillRect(-s / 2, -s / 3, s, s * 0.66);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx, cy - s / 2);
      ctx.lineTo(cx - s / 2, cy + s / 2);
      ctx.lineTo(cx + s / 2, cy + s / 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Stars / sparkle dots
  ctx.globalAlpha = 1.0;
  for (let i = 0; i < 12; i++) {
    const sx = rng() * size;
    const sy = rng() * size;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + rng() * 0.5})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brush strokes
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = colors[Math.floor(rng() * colors.length)];
    ctx.lineWidth = 3 + rng() * 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    let px = rng() * size;
    let py = rng() * size;
    ctx.moveTo(px, py);
    for (let j = 0; j < 4; j++) {
      px += (rng() - 0.5) * 150;
      py += (rng() - 0.5) * 150;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;

  const map = makeTexture(canvas, false);
  return { map, normalMap: null };
}

/**
 * WORLD MAP TEXTURE (for globe)
 */
export function generateWorldMapTexture(w = 1024, h = 512) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Ocean gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1B4F72');
  grad.addColorStop(0.3, '#2E86C1');
  grad.addColorStop(0.5, '#1B7F8F');
  grad.addColorStop(0.7, '#2E86C1');
  grad.addColorStop(1, '#1B4F72');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Simplified continents
  const drawLand = (points, color = '#2D7D3A') => {
    ctx.fillStyle = color;
    ctx.beginPath();
    const numPts = points.length;
    ctx.moveTo(points[0][0] * w, points[0][1] * h);
    for (let i = 1; i < numPts; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev[0] + curr[0]) / 2 * w;
      const cpy = (prev[1] + curr[1]) / 2 * h;
      ctx.quadraticCurveTo(prev[0] * w, prev[1] * h, cpx, cpy);
    }
    ctx.closePath();
    ctx.fill();
  };

  // North America
  drawLand([
    [0.08, 0.20], [0.12, 0.15], [0.20, 0.17], [0.27, 0.22],
    [0.29, 0.30], [0.27, 0.38], [0.24, 0.42], [0.20, 0.46],
    [0.17, 0.50], [0.14, 0.48], [0.11, 0.42], [0.07, 0.34],
    [0.05, 0.27]
  ], '#2D7D3A');

  // South America
  drawLand([
    [0.21, 0.52], [0.25, 0.50], [0.28, 0.53], [0.30, 0.58],
    [0.30, 0.66], [0.28, 0.73], [0.25, 0.80], [0.22, 0.84],
    [0.20, 0.78], [0.19, 0.70], [0.18, 0.60]
  ], '#27ae60');

  // Africa
  drawLand([
    [0.44, 0.38], [0.49, 0.35], [0.55, 0.38], [0.57, 0.45],
    [0.56, 0.56], [0.54, 0.65], [0.51, 0.72], [0.47, 0.70],
    [0.44, 0.62], [0.42, 0.50]
  ], '#D4AC0D');

  // Europe
  drawLand([
    [0.44, 0.20], [0.48, 0.17], [0.53, 0.19], [0.52, 0.25],
    [0.50, 0.32], [0.48, 0.35], [0.45, 0.38], [0.43, 0.34],
    [0.42, 0.27]
  ], '#229954');

  // Asia
  drawLand([
    [0.53, 0.14], [0.63, 0.12], [0.73, 0.14], [0.80, 0.19],
    [0.83, 0.27], [0.80, 0.35], [0.76, 0.40], [0.70, 0.42],
    [0.63, 0.40], [0.58, 0.37], [0.53, 0.33], [0.52, 0.26],
    [0.53, 0.20]
  ], '#2ECC71');

  // Australia
  drawLand([
    [0.76, 0.60], [0.80, 0.57], [0.86, 0.60], [0.88, 0.65],
    [0.86, 0.72], [0.82, 0.74], [0.78, 0.72], [0.76, 0.67]
  ], '#E67E22');

  // Ice caps
  ctx.fillStyle = 'rgba(236, 240, 241, 0.6)';
  ctx.fillRect(0, 0, w, h * 0.06);
  ctx.fillRect(0, h * 0.94, w, h * 0.06);

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 0.5;
  for (let lat = 0; lat < h; lat += 40) {
    ctx.beginPath(); ctx.moveTo(0, lat); ctx.lineTo(w, lat); ctx.stroke();
  }
  for (let lon = 0; lon < w; lon += 40) {
    ctx.beginPath(); ctx.moveTo(lon, 0); ctx.lineTo(lon, h); ctx.stroke();
  }

  const map = makeTexture(canvas, false);
  return { map, normalMap: null };
}
