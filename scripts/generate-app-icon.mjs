/**
 * Renders the Syllo app icon PNGs from assets/brand/syllo-mark.svg (ported from Havenly).
 *   assets/images/icon.png       1024×1024 full icon (brand blue + white mark), app.json `icon`
 *   assets/images/logo-mark.png  1024×1024 transparent white mark, source for the Android
 *                                adaptive foreground and the monochrome (themed) icon
 *   assets/images/favicon.png    48×48 web favicon
 *
 * Then run scripts/generate-android-adaptive-foreground.mjs.
 *
 * Run: npm run generate:app-icon
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const markSvg = join(root, 'assets/brand/syllo-mark.svg');

const SIZE = 1024;
// Brand blue (the prototype's primary #2563EB; richer behind white than the dark theme's
// #3B82F6). Keep in step with app.json android.adaptiveIcon.backgroundColor.
const BACKGROUND = '#2563EB';
// The mark is drawn in ink in the SVG; on the blue icon it's white for contrast.
const MARK_COLOR = '#FFFFFF';

const markSource = Buffer.from(readFileSync(markSvg, 'utf8').replaceAll('#0B0B1A', MARK_COLOR));
const mark = await sharp(markSource, { density: 300 }).resize(SIZE, SIZE).png().toBuffer();

await sharp(mark).toFile(join(root, 'assets/images/logo-mark.png'));

const icon = await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: BACKGROUND },
})
  .composite([{ input: mark }])
  // iOS rejects icons with transparency, so the full icon is flattened onto the blue.
  .flatten({ background: BACKGROUND })
  .removeAlpha()
  .png()
  .toBuffer();

await sharp(icon).toFile(join(root, 'assets/images/icon.png'));
await sharp(icon).resize(48, 48).png().toFile(join(root, 'assets/images/favicon.png'));

console.log('Wrote assets/images/icon.png, logo-mark.png and favicon.png');
