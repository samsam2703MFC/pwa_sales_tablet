/** Illustration shown for a product (or season) without a picture yet, or whose picture fails to load. */
export const PLACEHOLDER = 'img/placeholder.svg';

/** URLs with a scheme (BO photos made absolute by src/data/remote.ts, data: URLs) are used as is. */
const ABSOLUTE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Resolve a data image path ("img/p/croissant.png") against the app base URL. An absolute URL
 * is kept; an empty path (no picture) gives the placeholder.
 */
export const asset = (path: string): string =>
  ABSOLUTE.test(path) ? path : import.meta.env.BASE_URL + (path || PLACEHOLDER).replace(/^\//, '');

/**
 * A product photo from the BO (an absolute URL, src/data/remote.ts), as opposed to an illustration
 * bundled with the app (`img/…`), the placeholder (no picture) or an inline data: image. Photos
 * fill their frame (square, cropped); illustrations stay drawn in the middle of it.
 */
export const isPhoto = (path: string): boolean => ABSOLUTE.test(path) && !/^data:/i.test(path);

/**
 * Swaps any picture that fails to load (BO photo deleted, or not downloaded yet when offline)
 * for the placeholder instead of the browser's broken-image icon, marked `data-fallback` so a
 * photo frame draws it like an illustration. `error` does not bubble: listened for in the capture
 * phase, once for the whole document.
 */
export function installImageFallback(doc: Document = document): void {
  const placeholder = new URL(asset(PLACEHOLDER), doc.baseURI).href;
  doc.addEventListener('error', e => {
    const img = e.target;
    if (img instanceof HTMLImageElement && img.src !== placeholder) {
      img.dataset.fallback = '';
      img.src = placeholder;
    }
  }, true);
}
