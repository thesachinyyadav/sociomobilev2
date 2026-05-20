/**
 * generate-icons.mjs
 * Generates the full PWA icon ladder + a monochrome badge icon
 * from the existing applogo.png source.
 *
 * Run: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC  = join(ROOT, "public", "applogo.png");
const DEST = join(ROOT, "public", "icons");

if (!existsSync(DEST)) {
  mkdirSync(DEST, { recursive: true });
  console.log("[icons] Created /public/icons/");
}

const SIZES = [48, 72, 96, 128, 144, 192, 512];

async function generateRegularIcons() {
  for (const size of SIZES) {
    const outPath = join(DEST, `icon-${size}x${size}.png`);
    await sharp(SRC)
      .resize(size, size, { fit: "contain", background: { r: 1, g: 31, b: 123, alpha: 1 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`[icons] Generated icon-${size}x${size}.png`);
  }
}

async function generateBadgeIcon() {
  /**
   * The badge icon must be:
   * - 72×72 pixels
   * - Monochrome: white icon on transparent background
   * - Android uses it as a small overlay in the status bar
   *
   * Strategy: extract alpha from source, invert (make everything white),
   * composite onto transparent background.
   */
  const outPath = join(DEST, "badge-72x72.png");

  // Step 1: resize to 72x72 on transparent background
  const resized = await sharp(SRC)
    .resize(72, 72, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .toBuffer();

  // Step 2: Extract alpha channel (the shape of the logo)
  const alphaBuffer = await sharp(resized)
    .extractChannel("alpha")
    .toBuffer();

  // Step 3: Create a solid white 72x72 image, then apply the logo shape as alpha mask
  const whiteBuffer = await sharp({
    create: {
      width: 72,
      height: 72,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 },
    },
  })
    .png()
    .toBuffer();

  // Step 4: Composite the alpha shape onto the white canvas
  await sharp(whiteBuffer)
    .joinChannel(alphaBuffer)
    .toFile(outPath);

  console.log(`[icons] Generated badge-72x72.png (monochrome white-on-transparent)`);
}

async function main() {
  console.log("[icons] Source:", SRC);
  console.log("[icons] Output:", DEST);
  await generateRegularIcons();
  await generateBadgeIcon();
  console.log("[icons] All icons generated successfully!");
}

main().catch((err) => {
  console.error("[icons] FAILED:", err);
  process.exit(1);
});
