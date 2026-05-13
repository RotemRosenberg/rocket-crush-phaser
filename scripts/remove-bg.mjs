#!/usr/bin/env node
// One-time script: removes the grey/white background from each rocket PNG,
// leaving only the ship with a transparent background.
// Uses only Node.js built-ins — no npm packages required.
// Run: node scripts/remove-bg.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

// ── PNG helpers (same CRC-32 as generate-icons.mjs) ──────────────────────────

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
  return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))]);
}

// ── PNG filter reconstruction ─────────────────────────────────────────────────

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

// Decompress IDAT data and reconstruct raw RGBA pixels
function decodePixels(idatData, width, height) {
  const bpp     = 4;                    // RGBA = 4 bytes per pixel
  const rowBytes = width * bpp;
  const raw      = inflateSync(idatData); // includes 1 filter byte per row

  const pixels = new Uint8Array(width * height * bpp);

  for (let y = 0; y < height; y++) {
    const srcBase = y * (rowBytes + 1);
    const filter  = raw[srcBase];
    const dstBase = y * rowBytes;
    const prev    = y > 0 ? pixels.subarray((y - 1) * rowBytes, y * rowBytes)
                           : new Uint8Array(rowBytes);

    for (let x = 0; x < rowBytes; x++) {
      const r = raw[srcBase + 1 + x];
      const a = x >= bpp ? pixels[dstBase + x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;

      switch (filter) {
        case 0: pixels[dstBase + x] = r; break;
        case 1: pixels[dstBase + x] = (r + a) & 0xff; break;
        case 2: pixels[dstBase + x] = (r + b) & 0xff; break;
        case 3: pixels[dstBase + x] = (r + ((a + b) >> 1)) & 0xff; break;
        case 4: pixels[dstBase + x] = (r + paeth(a, b, c)) & 0xff; break;
        default: throw new Error(`Unknown PNG filter type: ${filter}`);
      }
    }
  }

  return pixels;
}

// Encode pixels back to IDAT (using None / type-0 filter for simplicity)
function encodePixels(pixels, width, height) {
  const bpp     = 4;
  const rowBytes = width * bpp;
  const raw      = new Uint8Array(height * (rowBytes + 1));

  for (let y = 0; y < height; y++) {
    raw[y * (rowBytes + 1)] = 0; // None filter
    raw.set(pixels.subarray(y * rowBytes, (y + 1) * rowBytes), y * (rowBytes + 1) + 1);
  }

  return deflateSync(Buffer.from(raw), { level: 9 });
}

// ── Background removal via flood-fill ─────────────────────────────────────────

// How different (sum of |ΔR|+|ΔG|+|ΔB|) a pixel can be from the background
// seed colour before the flood-fill treats it as part of the ship.
const TOLERANCE = 80;

function removeBackground(pixels, width, height) {
  // Sample corner pixel as background reference colour
  const bgR = pixels[0], bgG = pixels[1], bgB = pixels[2];
  console.log(`    Background colour: rgb(${bgR}, ${bgG}, ${bgB})`);

  // Seed from 4 corners + midpoints of all 4 edges
  const S = width;
  const H = height;
  const seeds = [
    0,           S - 1,
    S * (H - 1), S * H - 1,
    Math.floor(S / 2),
    S * (H - 1) + Math.floor(S / 2),
    S * Math.floor(H / 2),
    S * Math.floor(H / 2) + S - 1,
  ];

  const visited = new Uint8Array(width * height);
  const queue   = new Int32Array(width * height); // pre-allocated stack
  let   head    = 0;

  for (const s of seeds) { queue[head++] = s; }

  while (head > 0) {
    const px = queue[--head];
    if (visited[px]) continue;
    visited[px] = 1;

    const i = px * 4;
    if (pixels[i + 3] < 10) continue; // already transparent

    const diff = Math.abs(pixels[i] - bgR)
               + Math.abs(pixels[i + 1] - bgG)
               + Math.abs(pixels[i + 2] - bgB);
    if (diff > TOLERANCE) continue;   // too different → part of the ship

    pixels[i + 3] = 0;                // make transparent

    const row = Math.floor(px / width);
    const col = px % width;
    if (row > 0)          queue[head++] = px - width;
    if (row < height - 1) queue[head++] = px + width;
    if (col > 0)          queue[head++] = px - 1;
    if (col < width - 1)  queue[head++] = px + 1;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function processPNG(path) {
  const buf = readFileSync(path);

  // Parse PNG chunks
  let offset = 8; // skip 8-byte signature
  let width = 0, height = 0;
  const idatParts = [];

  while (offset < buf.length) {
    const len  = buf.readUInt32BE(offset);
    const type = buf.slice(offset + 4, offset + 8).toString('ascii');
    const data = buf.slice(offset + 8, offset + 8 + len);
    offset += 12 + len;

    if (type === 'IHDR') {
      width  = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const colorType = data[9];
      if (colorType !== 6) throw new Error(`Expected RGBA (colorType 6), got ${colorType}`);
    } else if (type === 'IDAT') {
      idatParts.push(data);
    }
  }

  console.log(`    Size: ${width}×${height}`);

  const pixels      = decodePixels(Buffer.concat(idatParts), width, height);
  removeBackground(pixels, width, height);
  const compressed  = encodePixels(pixels, width, height);

  // Write new PNG
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = pngChunk('IHDR', Buffer.concat([
    u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0]),
  ]));
  const idat = pngChunk('IDAT', compressed);
  const iend = pngChunk('IEND', Buffer.alloc(0));

  writeFileSync(path, Buffer.concat([sig, ihdr, idat, iend]));
}

const FILES = ['rocket_RED', 'rocket_BLUE', 'rocket_GREEN', 'rocket_YELLOW', 'rocket_PURPLE'];

for (const name of FILES) {
  const path = `public/assets/${name}.png`;
  console.log(`\nProcessing ${name}.png …`);
  const t = Date.now();
  processPNG(path);
  console.log(`    ✅ Done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

console.log('\n✅ All rocket images saved with transparent backgrounds.');
console.log('   Run `npm run dev` to see the result.');
