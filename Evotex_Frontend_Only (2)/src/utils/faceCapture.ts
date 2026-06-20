/** Capture a face frame from the front camera and compute a perceptual hash for matching. */

function computeDHash(imageData: ImageData): string {
  const w = 9;
  const h = 8;
  const srcW = imageData.width;
  const srcH = imageData.height;
  const gray: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w + 1; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x / w) * srcW));
      const sy = Math.min(srcH - 1, Math.floor((y / (h - 1)) * srcH));
      const i = (sy * srcW + sx) * 4;
      gray.push(
        0.299 * imageData.data[i] +
          0.587 * imageData.data[i + 1] +
          0.114 * imageData.data[i + 2]
      );
    }
  }

  let bits = '';
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w; x++) {
      const left = gray[y * (w + 1) + x];
      const right = gray[y * (w + 1) + x + 1];
      bits += left < right ? '1' : '0';
    }
  }

  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

export async function captureFaceFromVideo(video: HTMLVideoElement): Promise<{ dHash: string }> {
  if (video.readyState < 2) {
    await new Promise<void>((resolve) => {
      video.onloadeddata = () => resolve();
    });
  }
  await new Promise((r) => setTimeout(r, 600));

  const canvas = document.createElement('canvas');
  const vw = video.videoWidth || 320;
  const vh = video.videoHeight || 240;
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read camera frame');

  ctx.drawImage(video, 0, 0);
  const imageData = ctx.getImageData(0, 0, vw, vh);
  return { dHash: computeDHash(imageData) };
}
