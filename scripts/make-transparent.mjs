import sharp from "sharp";

const SRC = "C:\\projects\\SOCIO\\sociomobilev2\\public\\s_logo.png";
const DEST = "C:\\projects\\SOCIO\\sociomobilev2\\public\\s_logo_transparent.png";

async function main() {
  const image = sharp(SRC);
  const metadata = await image.metadata();
  
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Create buffers for output
  const outputBuffer = Buffer.alloc(info.width * info.height * 4);
  const blueBuffer = Buffer.alloc(info.width * info.height * 4);
  const watermarkBuffer = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const a = data[i+3];

    const pixelIndex = i / 4;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    
    const dx = x - 256;
    const dy = y - 256;
    const dist = Math.sqrt(dx*dx + dy*dy);

    const isBlue = (b > r && b > g);
    const isOuter = dist > 250;
    const isWhite = (r > 240 && g > 240 && b > 240 && dist > 220);

    if (isBlue || isWhite || isOuter || a === 0) {
      outputBuffer[i] = 0;
      outputBuffer[i+1] = 0;
      outputBuffer[i+2] = 0;
      outputBuffer[i+3] = 0;

      blueBuffer[i] = 0;
      blueBuffer[i+1] = 0;
      blueBuffer[i+2] = 0;
      blueBuffer[i+3] = 0;

      watermarkBuffer[i] = 0;
      watermarkBuffer[i+1] = 0;
      watermarkBuffer[i+2] = 0;
      watermarkBuffer[i+3] = 0;
    } else {
      outputBuffer[i] = r;
      outputBuffer[i+1] = g;
      outputBuffer[i+2] = b;
      outputBuffer[i+3] = a;

      // Solid blue silhouette (#123B8C)
      blueBuffer[i] = 18;
      blueBuffer[i+1] = 59;
      blueBuffer[i+2] = 140;
      blueBuffer[i+3] = a;

      // Faint blue silhouette for native Android watermark (3% opacity)
      watermarkBuffer[i] = 18;
      watermarkBuffer[i+1] = 59;
      watermarkBuffer[i+2] = 140;
      watermarkBuffer[i+3] = Math.round(a * 0.03);
    }
  }

  await sharp(outputBuffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png({ compressionLevel: 9 })
  .toFile(DEST);

  const BLUE_DEST = "C:\\projects\\SOCIO\\sociomobilev2\\public\\s_logo_blue.png";
  await sharp(blueBuffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png({ compressionLevel: 9 })
  .toFile(BLUE_DEST);

  const WATERMARK_DEST = "C:\\projects\\SOCIO\\sociomobilev2\\android\\app\\src\\main\\res\\drawable\\splash_watermark_png.png";
  await sharp(watermarkBuffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png({ compressionLevel: 9 })
  .toFile(WATERMARK_DEST);

  console.log("Transparent logo generated successfully at:", DEST);
  console.log("Blue silhouette logo generated successfully at:", BLUE_DEST);
  console.log("Watermark logo generated successfully at:", WATERMARK_DEST);
}

main().catch(console.error);
