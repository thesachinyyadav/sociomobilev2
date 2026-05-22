import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC  = join(ROOT, "public", "applogo.png");
const DEST = join(ROOT, "android", "app", "src", "main", "res", "drawable", "splash_logo.png");

async function main() {
  // Target dimensions: 512x512 square.
  // The logo inside will be resized to fit within a 280x280 area (55% of the total size)
  // to avoid getting cut off by the system's circular mask on Android 12+.
  console.log(`[splash-logo] Processing ${SRC} -> ${DEST}`);
  
  const innerSize = 280;
  const padding = (512 - innerSize) / 2; // 116 pixels padding on each side

  await sharp(SRC)
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png({ compressionLevel: 9 })
    .toFile(DEST);

  console.log("[splash-logo] Padded splash_logo.png generated successfully!");
}

main().catch((err) => {
  console.error("[splash-logo] FAILED:", err);
  process.exit(1);
});
