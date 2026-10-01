#!/usr/bin/env node
/**
 * Generates the PWA, Apple and favicon icons from the brand line-art croissant
 * (public/img/onb/croissant.png), painted Ruby Red on the beige page background.
 *
 *   node scripts/generate-icons.mjs [--out <dir>]     (default: public/)
 *
 * Writes <out>/icons/*.png and <out>/favicon.ico. The output is committed: run this
 * script again only when the source illustration or the colours change.
 *
 * Rendering uses Playwright's Chromium as a canvas runtime (no image library needed):
 * each icon is drawn supersampled ×4, the thin source stroke is thickened (disc
 * dilation) so the drawing still reads at small sizes, then the bitmap is halved
 * step by step down to its final size for clean anti-aliasing.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? path.resolve(process.argv[outArg + 1]) : path.join(ROOT, 'public');
const SOURCE = path.join(ROOT, 'public/img/onb/croissant.png');
/** Stroke width of the source line art, in source pixels (measured: ~2.6 px at 400 px). */
const SOURCE_STROKE = 2.6;

/** Design-system colours (see src/styles/global.css). */
const BEIGE = '#EAE4DC';
const RUBY = '#8D1D2C';

/**
 * Icon specs.
 * - shape: 'tile' = rounded square on a transparent canvas (purpose "any", favicons);
 *          'bleed' = full-bleed square (maskable: the OS applies its own mask; Apple touch icon).
 * - art:   longest side of the drawing's bounding box, as a fraction of the icon size. Maskable
 *          icons keep the drawing inside the safe circle (radius 40 %, checked by e2e/pwa.spec.ts).
 * - line:  target stroke width, as a fraction of the icon size (heavier for small sizes).
 */
const ICONS = [
  { file: 'icons/icon-192.png', size: 192, shape: 'tile', art: 0.7, line: 0.03 },
  { file: 'icons/icon-512.png', size: 512, shape: 'tile', art: 0.7, line: 0.021 },
  { file: 'icons/icon-maskable-192.png', size: 192, shape: 'bleed', art: 0.58, line: 0.03 },
  { file: 'icons/icon-maskable-512.png', size: 512, shape: 'bleed', art: 0.58, line: 0.021 },
  { file: 'icons/apple-touch-icon.png', size: 180, shape: 'bleed', art: 0.68, line: 0.03 },
  { file: 'icons/favicon-48.png', size: 48, shape: 'tile', art: 0.8, line: 0.05 },
  { file: 'icons/favicon-32.png', size: 32, shape: 'tile', art: 0.84, line: 0.062 },
  { file: 'icons/favicon-16.png', size: 16, shape: 'tile', art: 0.9, line: 0.085 },
];

/** Sizes bundled into favicon.ico (PNG-compressed entries). */
const ICO_SIZES = [16, 32, 48];

const SUPERSAMPLE = 4;

/** Runs in the page: draws one icon and returns it as a base64 PNG. */
async function drawIcon({ src, spec, colors, k, srcStroke }) {
  const img = new Image();
  img.src = src;
  await img.decode();

  // Bounding box of the drawing (opaque pixels) in the source image.
  const probe = new OffscreenCanvas(img.width, img.height);
  const pc = probe.getContext('2d');
  pc.drawImage(img, 0, 0);
  const { data } = pc.getImageData(0, 0, img.width, img.height);
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (data[(y * img.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

  const S = spec.size * k;
  const canvas = new OffscreenCanvas(S, S);
  const ctx = canvas.getContext('2d');

  // Background: rounded tile (transparent corners) or full bleed.
  ctx.fillStyle = colors.bg;
  if (spec.shape === 'tile') {
    ctx.beginPath();
    ctx.roundRect(0, 0, S, S, S * 0.22);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, S, S);
  }

  // Art layer: the drawing scaled into the tile, centred on its bounding box.
  const scale = (S * spec.art) / Math.max(bw, bh);
  const dw = img.width * scale, dh = img.height * scale;
  const dx = (S - bw * scale) / 2 - x0 * scale;
  const dy = (S - bh * scale) / 2 - y0 * scale;
  const base = new OffscreenCanvas(S, S);
  const bc = base.getContext('2d');
  bc.imageSmoothingQuality = 'high';
  bc.drawImage(img, dx, dy, dw, dh);
  const art = new OffscreenCanvas(S, S);
  const ac = art.getContext('2d');
  ac.drawImage(base, 0, 0);
  // Thicken the stroke to the target width with a disc dilation: copies stamped on concentric
  // rings, spaced by less than half the current stroke so their union has no gaps.
  const stroke = srcStroke * scale;
  const radius = Math.max(0, (spec.line * S - stroke) / 2);
  const gap = Math.max(0.5, stroke / 2);
  for (let r = gap; r < radius + gap; r += gap) {
    const rr = Math.min(r, radius);
    const steps = Math.max(8, Math.ceil((2 * Math.PI * rr) / gap));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * 2 * Math.PI;
      ac.drawImage(base, rr * Math.cos(a), rr * Math.sin(a));
    }
  }
  // Paint the ink in Ruby Red (keeps the anti-aliased alpha).
  ac.globalCompositeOperation = 'source-in';
  ac.fillStyle = colors.ink;
  ac.fillRect(0, 0, S, S);
  ctx.drawImage(art, 0, 0);

  // Downscale by successive halvings for clean anti-aliasing.
  let cur = canvas;
  while (cur.width > spec.size) {
    const n = Math.max(spec.size, cur.width / 2);
    const next = new OffscreenCanvas(n, n);
    const nc = next.getContext('2d');
    nc.imageSmoothingEnabled = true;
    nc.imageSmoothingQuality = 'high';
    nc.drawImage(cur, 0, 0, n, n);
    cur = next;
  }
  const blob = await cur.convertToBlob({ type: 'image/png' });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Packs PNG buffers into a .ico container (Vista+ PNG entries). */
function toIco(entries) {
  const header = Buffer.alloc(6 + 16 * entries.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach(({ size, png }, i) => {
    const o = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, o); // width
    header.writeUInt8(size >= 256 ? 0 : size, o + 1); // height
    header.writeUInt8(0, o + 2); // palette colours
    header.writeUInt8(0, o + 3); // reserved
    header.writeUInt16LE(1, o + 4); // colour planes
    header.writeUInt16LE(32, o + 6); // bits per pixel
    header.writeUInt32LE(png.length, o + 8);
    header.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...entries.map(e => e.png)]);
}

async function main() {
  const src = 'data:image/png;base64,' + fs.readFileSync(SOURCE).toString('base64');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><title>icons</title>');
    const pngs = new Map();
    for (const spec of ICONS) {
      const b64 = await page.evaluate(drawIcon, { src, spec, colors: { bg: BEIGE, ink: RUBY }, k: SUPERSAMPLE, srcStroke: SOURCE_STROKE });
      const png = Buffer.from(b64, 'base64');
      const file = path.join(OUT, spec.file);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, png);
      pngs.set(spec.size + spec.shape, png);
      console.log(`${spec.file.padEnd(30)} ${String(spec.size).padStart(3)} px  ${png.length} B`);
    }
    const ico = toIco(ICO_SIZES.map(size => ({ size, png: pngs.get(size + 'tile') })));
    fs.writeFileSync(path.join(OUT, 'favicon.ico'), ico);
    console.log(`${'favicon.ico'.padEnd(30)} ${ICO_SIZES.join('/')} px  ${ico.length} B`);
  } finally {
    await browser.close();
  }
}

await main();
