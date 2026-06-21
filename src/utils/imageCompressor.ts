/**
 * @file imageCompressor.ts
 * @description Client-side image compression utility using the HTML5 Canvas API.
 *
 * # Purpose
 * Receipt photos from modern smartphones can be 3–12 MB. Sending this raw
 * to the Edge Proxy (Cloudflare Worker) would be expensive in both latency
 * and bandwidth. This module downscales images to a 1200px max dimension and
 * re-encodes at 60% JPEG quality, reducing typical payloads to 80–150 KB.
 *
 * # How It Works
 * 1. A `FileReader` reads the image file as a base64 data URL.
 * 2. An off-screen `Image` element decodes the JPEG/PNG into bitmap pixels.
 * 3. An off-screen `HTMLCanvasElement` redraws at the target dimensions.
 * 4. `canvas.toDataURL('image/jpeg', quality)` produces a compressed base64 string.
 *
 * # Privacy
 * The compressed image is processed entirely in the browser. It is only
 * transmitted to the Edge Proxy if the user initiates a scan. If the proxy
 * is offline, the image is never sent anywhere.
 *
 * @module imageCompressor
 */

/**
 * Compresses an image `File` to a base64-encoded JPEG data URL using the
 * HTML5 Canvas API. Preserves aspect ratio during downscaling.
 *
 * @param file         - The raw image file selected by the user (JPEG or PNG).
 * @param maxDimension - Maximum width or height in pixels after downscaling.
 *                       Defaults to 1200px. Larger dimension is bounded; aspect
 *                       ratio is maintained by proportional scaling of the smaller.
 * @param quality      - JPEG compression quality, between 0.0 (worst) and 1.0 (best).
 *                       Defaults to 0.6 — a good balance between file size and
 *                       OCR text legibility. Values below 0.5 can blur fine print.
 *
 * @returns A Promise that resolves with a base64 JPEG data URL string.
 * @throws {Error} If the canvas 2D context cannot be acquired.
 * @throws {Error} If the image fails to decode (corrupt or unsupported format).
 * @throws {Error} If the FileReader fails to read the file.
 *
 * @example
 * const base64 = await compressImage(rawFile);
 * // → "data:image/jpeg;base64,/9j/4AAQSkZ..."
 * await fetch(proxyUrl, { body: JSON.stringify({ imagePayload: base64 }) });
 */
export async function compressImage(
  file: File,
  maxDimension = 1200,
  quality = 0.6,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        // ── Dimension Calculation ─────────────────────────────────────────
        // Constrain only the larger dimension so the aspect ratio is preserved.
        // If both dimensions are within maxDimension, no downscaling occurs.
        let { width, height } = img;

        if (width > height) {
          if (width > maxDimension) {
            // Landscape: bound width, scale height proportionally
            height = Math.round((height * maxDimension) / width);
            width  = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            // Portrait: bound height, scale width proportionally
            width  = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // ── Canvas Rendering ──────────────────────────────────────────────
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to acquire canvas 2D context'));
          return;
        }

        // Draw the image at the new dimensions. The browser's built-in
        // bilinear/bicubic interpolation produces clean downscaling.
        ctx.drawImage(img, 0, 0, width, height);

        // Encode as JPEG — PNG would be lossless but ~3× larger for photos.
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to decode image into memory'));

      // Assign the FileReader's base64 result as the image source to trigger load.
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('FileReader failed to read the selected file'));

    // Read the file as a base64 data URL. The `onload` callback fires when complete.
    reader.readAsDataURL(file);
  });
}
