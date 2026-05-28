import { downloadRecipeImage, uploadRecipeImageBlob } from './storage';

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

/**
 * Three imageKey schemes are supported on a Recipe row:
 *
 * - `bundle:<path>` — the seeded catalogue points at a cover image bundled
 *   with the static app at `/seed/<path>`. Resolved synchronously to a plain
 *   HTTP URL.
 *
 * - `data:image/...;base64,...` — the cover image is base64-encoded directly
 *   on the Recipe row. This is the default for user-uploaded covers because
 *   it keeps writes to a single round-trip; the browser renders data URLs
 *   natively so we just return it as-is.
 *
 * - `<recipeId>/<filename>` — Rayfin storage blob. Used when
 *   `VITE_STORAGE_MODE=storage`. Goes through the signed-in `apiClient` in
 *   [./storage.ts](./storage.ts).
 *
 * The mode is selected at build time so the same bundle never mixes
 * upload paths within one deploy.
 */

const BUNDLE_PREFIX = 'bundle:';
const DATA_URL_PREFIX = 'data:';
const STORAGE_MODE = import.meta.env.VITE_STORAGE_MODE ?? 'inline';

/** Build the imageKey we store on a Recipe row for the given seed image path. */
export function bundledImageKey(relativePath: string): string {
  return `${BUNDLE_PREFIX}${relativePath}`;
}

/** Resolve a recipe imageKey to a URL the browser can render directly. */
export async function getImageUrl(imageKey: string | undefined): Promise<string | null> {
  if (!imageKey) return null;

  // Bundled assets resolve synchronously to a normal HTTP URL.
  if (imageKey.startsWith(BUNDLE_PREFIX)) {
    return `/seed/${imageKey.slice(BUNDLE_PREFIX.length)}`;
  }

  // Inline data URLs render natively — no fetch, no cache work.
  if (imageKey.startsWith(DATA_URL_PREFIX)) {
    return imageKey;
  }

  // Otherwise the imageKey is a Rayfin storage object path.
  if (cache.has(imageKey)) {
    const v = cache.get(imageKey);
    return v ? v : null;
  }
  const existing = inflight.get(imageKey);
  if (existing) return existing;

  const { name, prefix } = splitKey(imageKey);
  const promise = (async (): Promise<string | null> => {
    try {
      const { blob } = await downloadRecipeImage(name, prefix ?? '');
      const url = URL.createObjectURL(blob);
      cache.set(imageKey, url);
      return url;
    } catch (err) {
      cache.set(imageKey, '');
      const code = (err as { code?: string } | null)?.code;
      if (code !== 'NotFound') {
        // eslint-disable-next-line no-console
        console.warn('[contoso-chef] image download failed:', imageKey, err);
      }
      return null;
    } finally {
      inflight.delete(imageKey);
    }
  })();

  inflight.set(imageKey, promise as unknown as Promise<string>);
  return promise;
}

export function invalidateImage(imageKey: string | undefined): void {
  if (!imageKey) return;
  const url = cache.get(imageKey);
  if (url) URL.revokeObjectURL(url);
  cache.delete(imageKey);
}

export function splitKey(imageKey: string): { name: string; prefix?: string } {
  const idx = imageKey.lastIndexOf('/');
  if (idx === -1) return { name: imageKey };
  return { prefix: imageKey.slice(0, idx), name: imageKey.slice(idx + 1) };
}

/**
 * Upload a cover image for the given recipe. The behaviour depends on
 * `VITE_STORAGE_MODE`:
 *  - `inline` (default): base64-encode the file and return a data: URL as
 *    the imageKey. No network request — the caller will write it onto the
 *    Recipe row in their next mutation.
 *  - `storage`: upload to Rayfin storage and return the storage path.
 *
 * In `inline` mode the file is also resized + recompressed in-browser so
 * even multi-MB phone photos stay under the GraphQL request size limit.
 */
export async function uploadRecipeImage(
  recipeId: string,
  file: File
): Promise<{ imageKey: string; imageAlt: string }> {
  if (STORAGE_MODE === 'storage') {
    const ext = guessExtension(file);
    const name = `cover.${ext}`;
    await uploadRecipeImageBlob(recipeId, name, file, file.type || 'image/jpeg');
    const imageKey = `${recipeId}/${name}`;
    invalidateImage(imageKey);
    return { imageKey, imageAlt: file.name };
  }

  // Inline (default): downscale + recompress, then encode as a data URL.
  // The Microsoft Fabric GraphQL gateway returns 500 ("authentication token
  // error") for request bodies above ~65 KB. We cap the data URL at 45 KB
  // (leaves ~20 KB for the rest of the mutation envelope) and ladder down
  // through resize/quality presets until the result fits.
  const MAX_DATA_URL_CHARS = 45_000;
  const presets: Array<[number, number]> = [
    [800, 0.78],
    [640, 0.75],
    [512, 0.7],
    [400, 0.65],
    [320, 0.6],
  ];
  let dataUrl = '';
  for (const [edge, quality] of presets) {
    dataUrl = await fileToDownscaledDataUrl(file, edge, quality);
    if (dataUrl.length <= MAX_DATA_URL_CHARS) break;
  }
  // eslint-disable-next-line no-console
  console.log(
    '[contoso-chef] inline image:',
    file.size,
    'bytes ->',
    dataUrl.length,
    `chars (${(dataUrl.length / 1024).toFixed(1)} KB)`
  );
  return { imageKey: dataUrl, imageAlt: file.name };
}

/**
 * Decode the input image, scale so the longest edge is at most `maxEdge`
 * pixels (preserving aspect ratio, never upscaling), and re-encode as JPEG
 * at the given quality. Returns a `data:image/jpeg;base64,...` URL.
 *
 * For files that already are smaller than ~250KB and at most ${maxEdge}px
 * on either side, returns the original file unchanged so we don't pay the
 * canvas re-encode cost or visibly degrade quality.
 */
async function fileToDownscaledDataUrl(
  file: File,
  maxEdge: number,
  quality: number
): Promise<string> {
  const SMALL_FILE_BYTES = 250 * 1024;
  const bitmap = await loadBitmap(file);
  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  const isAlreadySmall = file.size <= SMALL_FILE_BYTES && longest <= maxEdge;
  if (isAlreadySmall) {
    bitmap.close?.();
    return readFileAsDataUrl(file);
  }

  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', quality);
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  // Fallback: very old browsers — go through HTMLImageElement.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(undefined);
      img.onerror = () => reject(new Error('Failed to decode image'));
    });
    // ImageBitmap is widely supported; this fallback only triggers on
    // genuinely ancient browsers, where the cast is acceptable.
    return img as unknown as ImageBitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected FileReader result type'));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

function guessExtension(file: File): string {
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  const m = file.name.match(/\.([a-z0-9]+)$/i);
  return (m?.[1] ?? 'bin').toLowerCase();
}
