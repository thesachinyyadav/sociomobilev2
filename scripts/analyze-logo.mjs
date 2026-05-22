import sharp from "sharp";
import { join } from "path";

const MOCKUP_PATH = "C:\\Users\\Surya VM\\.gemini\\antigravity-ide\\brain\\7e2f5014-09d7-4d0d-ad67-90a22f412c25\\media__1779454902779.png";

async function main() {
  const image = sharp(MOCKUP_PATH);
  const metadata = await image.metadata();
  const { data } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const centerX = Math.floor(metadata.width / 2);
  
  // Find top boundary
  let topY = -1;
  for (let y = 300; y < 400; y++) {
    const idx = (y * metadata.width + centerX) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Circle background color is a dark blue, e.g. B > 100, R < 30
    if (b > 100 && r < 30) {
      topY = y;
      break;
    }
  }

  // Find bottom boundary
  let bottomY = -1;
  for (let y = 580; y >= 500; y--) {
    const idx = (y * metadata.width + centerX) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (b > 100 && r < 30) {
      bottomY = y;
      break;
    }
  }

  console.log(`Precise Top Y: ${topY}, Precise Bottom Y: ${bottomY}`);
  const centerY = Math.floor((topY + bottomY) / 2);
  const height = bottomY - topY + 1;
  console.log(`Center Y: ${centerY}, Height/Diameter: ${height}`);

  // Find left boundary along centerY
  let leftX = -1;
  for (let x = 50; x < centerX; x++) {
    const idx = (centerY * metadata.width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (b > 100 && r < 30) {
      leftX = x;
      break;
    }
  }

  // Find right boundary along centerY
  let rightX = -1;
  for (let x = metadata.width - 50; x >= centerX; x--) {
    const idx = (centerY * metadata.width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (b > 100 && r < 30) {
      rightX = x;
      break;
    }
  }

  console.log(`Precise Left X: ${leftX}, Precise Right X: ${rightX}`);
  const width = rightX - leftX + 1;
  console.log(`Center X: ${Math.floor((leftX + rightX) / 2)}, Width/Diameter: ${width}`);

  const OUTPUT_PATH = "C:\\projects\\SOCIO\\sociomobilev2\\public\\s_logo.png";
  console.log(`Cropping logo from ${leftX}, ${topY} with size ${width}x${height} and writing to ${OUTPUT_PATH}...`);

  await sharp(MOCKUP_PATH)
    .extract({ left: leftX, top: topY, width: width, height: height })
    .resize(512, 512, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3
    })
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT_PATH);

  console.log("Logo cropped and saved successfully!");
}

main().catch(console.error);
