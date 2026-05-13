#!/usr/bin/env node
// Generates PWA icons without any external dependencies.
// Uses Node.js built-ins (fs, zlib) to write valid PNG files.
//
// Design: glowing blue-white orb fading to dark space, with sparse star dots.
// Run: node scripts/generate-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// ── PNG helpers ───────────────────────────────────────────────────────────────

/** CRC-32 lookup table (PNG standard polynomial 0xedb88320) */
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1 ? 0xedb88320 : 0) ^ (c >>> 1);
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u32(n) {
  return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return Buffer.concat([u32(d.length), t, d, u32(crc32(Buffer.concat([t, d])))]);
}

// ── Pixel drawing ─────────────────────────────────────────────────────────────

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function pixelColor(x, y, size) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const d  = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  const t  = Math.min(1, d / (size / 2)); // 0 = center, 1 = edge

  let r, g, b;

  if (t < 0.22) {
    // Core: white-hot centre blending to bright blue
    const u = t / 0.22;
    r = lerp(255, 120, u);
    g = lerp(255, 175, u);
    b = 255;
  } else if (t < 0.58) {
    // Glow halo: bright blue → deep space blue
    const u = (t - 0.22) / 0.36;
    r = lerp(120,  10, u);
    g = lerp(175,  10, u);
    b = lerp(255,  42, u);
  } else {
    // Outer space background
    r = 10; g = 10; b = 26;
  }

  // Sparse, deterministic star dots (hashed position, no RNG for reproducibility)
  if (t > 0.62) {
    const hash = Math.abs((x * 7919 + y * 6271) % 997);
    if (hash < 5) { r = 200; g = 220; b = 255; }
  }

  return [r, g, b];
}

// ── PNG builder ───────────────────────────────────────────────────────────────

function makePNG(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // filter byte + RGB
    row[0] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelColor(x, y, size);
      row[1 + x * 3]     = r;
      row[1 + x * 3 + 1] = g;
      row[1 + x * 3 + 2] = b;
    }
    rows.push(row);
  }

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = pngChunk('IHDR', Buffer.concat([
    u32(size), u32(size),
    Buffer.from([8, 2, 0, 0, 0]), // 8-bit depth, RGB color type
  ]));
  const idat = pngChunk('IDAT', deflateSync(Buffer.concat(rows)));
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// ── Entry ─────────────────────────────────────────────────────────────────────

mkdirSync('public/icons', { recursive: true });

for (const size of [192, 512]) {
  const path = `public/icons/icon-${size}.png`;
  writeFileSync(path, makePNG(size));
  console.log(`✅ ${path}`);
}
