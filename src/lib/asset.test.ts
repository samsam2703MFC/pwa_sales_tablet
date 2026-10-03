import { afterEach, describe, expect, it } from 'vitest';
import { asset, installImageFallback, isPhoto, PLACEHOLDER } from './asset';

describe('asset', () => {
  it('resolves app-relative paths against the base URL', () => {
    expect(asset('img/p/croissant.png')).toBe('/img/p/croissant.png');
    expect(asset('/img/logo.png')).toBe('/img/logo.png');
  });

  it('keeps absolute URLs (BO photos)', () => {
    expect(asset('http://bo.test/consulant_bo/uploads/tablette/1-640.jpg')).toBe('http://bo.test/consulant_bo/uploads/tablette/1-640.jpg');
    expect(asset('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('no picture → the placeholder illustration', () => {
    expect(asset('')).toBe('/' + PLACEHOLDER);
  });
});

describe('isPhoto', () => {
  it('a BO photo (absolute URL) is a photo; app illustrations, the placeholder and data: images are not', () => {
    expect(isPhoto('http://bo.test/consulant_bo/uploads/tablette/1-640.jpg')).toBe(true);
    expect(isPhoto('https://bo.test/uploads/plano/panel/2.jpg')).toBe(true);
    expect(isPhoto('img/p/croissant.png')).toBe(false);
    expect(isPhoto('')).toBe(false);
    expect(isPhoto('data:image/png;base64,AAAA')).toBe(false);
  });
});

describe('installImageFallback', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('swaps a picture that fails to load for the placeholder, once', () => {
    installImageFallback();
    const img = document.createElement('img');
    img.src = 'http://bo.test/uploads/tablette/gone.jpg';
    document.body.append(img);
    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe(new URL('/' + PLACEHOLDER, document.baseURI).href);
    expect(img.hasAttribute('data-fallback')).toBe(true); // drawn as an illustration in a photo frame
    // the placeholder itself failing does not loop
    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe(new URL('/' + PLACEHOLDER, document.baseURI).href);
  });
});
