/**
 * Scales logo-mark.png down on a 1024×1024 canvas for Android adaptive icons (ported from
 * Havenly). Android masks clip foreground art outside the 66dp safe circle (of 108dp), a
 * radius of ~313px on this canvas. The book's outer corners reach furthest from the centre
 * (~401px at full size); 72% (Havenly's value) touched the ring, so 68% puts them at ~273px,
 * inside a circular mask with a margin. The same file is the monochrome (themed) icon.
 *
 * Run: npm run generate:android-icon (after generate:app-icon)
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const source = join(root, 'assets/images/logo-mark.png');
const output = join(root, 'assets/images/android-adaptive-foreground.png');

const CANVAS = 1024;
const LOGO_SCALE = 0.68;

const logoSize = Math.round(CANVAS * LOGO_SCALE);
const inset = Math.round((CANVAS - logoSize) / 2);

const resized = await sharp(source)
  .resize(logoSize, logoSize, {
    fit: 'inside',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const meta = await sharp(resized).metadata();
const padTop = inset + Math.round((logoSize - (meta.height ?? logoSize)) / 2);
const padLeft = inset + Math.round((logoSize - (meta.width ?? logoSize)) / 2);
const padBottom = CANVAS - (meta.height ?? logoSize) - padTop;
const padRight = CANVAS - (meta.width ?? logoSize) - padLeft;

await sharp(resized)
  .extend({
    top: padTop,
    bottom: padBottom,
    left: padLeft,
    right: padRight,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(output);

console.log(`Wrote ${output} (logo at ${LOGO_SCALE * 100}% scale)`);
