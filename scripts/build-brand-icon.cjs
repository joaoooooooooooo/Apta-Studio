const fs = require('node:fs');
const sharp = require('sharp');
const { GIFEncoder } = require('gifenc');

async function main() {
  const source = sharp('app/Animated GIF Maker Speed (1).gif', { animated: true });
  const { width, pageHeight: height, pages, delay } = await source.metadata();
  const { data } = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const gif = GIFEncoder();
  const frameSize = width * height * 4;
  const palette = [[0, 0, 0]];
  const colorIndexes = new Map();

  for (let pixel = 0; pixel < data.length; pixel += 4) {
    const key = `${data[pixel]},${data[pixel + 1]},${data[pixel + 2]}`;
    if (!colorIndexes.has(key)) {
      colorIndexes.set(key, palette.length);
      palette.push([data[pixel], data[pixel + 1], data[pixel + 2]]);
    }
  }
  if (palette.length > 256) throw new Error('The source GIF has too many colors for its palette');

  for (let frame = 0; frame < pages; frame++) {
    const rgba = data.subarray(frame * frameSize, (frame + 1) * frameSize);
    const indexed = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = y * width + x;
        const corner = (x === 0 || x === width - 1) && (y === 0 || y === height - 1);
        const offset = pixel * 4;
        const key = `${rgba[offset]},${rgba[offset + 1]},${rgba[offset + 2]}`;
        indexed[pixel] = corner || rgba[offset + 3] < 128 ? 0 : colorIndexes.get(key);
      }
    }

    gif.writeFrame(indexed, width, height, {
      palette,
      transparent: true,
      transparentIndex: 0,
      delay: delay[frame],
      dispose: 2,
    });
  }

  gif.finish();
  fs.writeFileSync('public/brand-icon.gif', gif.bytes());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
