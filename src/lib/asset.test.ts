import { afterEach, describe, expect, it } from 'vitest';
import { asset, installImageFallback, PLACEHOLDER } from './asset';

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

describe('installImageFallback', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('swaps a picture that fails to load for the placeholder, once', () => {
    installImageFallback();
    const img = document.createElement('img');
    img.src = 'http://bo.test/uploads/tablette/gone.jpg';
    document.body.append(img);
    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe(new URL('/' + PLACEHOLDER, document.baseURI).href);
    // the placeholder itself failing does not loop
    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe(new URL('/' + PLACEHOLDER, document.baseURI).href);
  });
});
