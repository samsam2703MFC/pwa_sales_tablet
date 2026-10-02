import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { reloadWhenIdle, watchForUpdates } from './pwa/register';
import { BOOK, SAMPLE_BOOK, setBook } from './data/book';
import { bookChanged, bookUrl, loadBook, remotePhotos } from './data/remote';
import { validateBook } from './data/validate';
import { warmPhotos } from './data/warmPhotos';
import { API_ROOT, PUBLIC_ROOT } from './lib/api';
import { installImageFallback } from './lib/asset';
import { config } from './lib/config';

/**
 * Boot: get the book (the BO's, else the bundled sample), install it, and only then load the
 * app. The views and src/lib/catalog.ts read BOOK when they are first evaluated (catalog
 * lookups) or called (default parameters), so `./App` is imported dynamically AFTER setBook.
 * Nothing imported statically here may import src/lib/catalog.ts.
 */
async function boot() {
  const url = bookUrl(API_ROOT, config.shop);
  const { book, source } = await loadBook({ url, sample: SAMPLE_BOOK, publicRoot: PUBLIC_ROOT, online: navigator.onLine });
  setBook(book, source);

  // Development only (removed from the production build): flag broken ids in the book at once.
  if (import.meta.env.DEV) {
    const errors = validateBook(BOOK);
    if (errors.length) console.error('Book invalide :\n' + errors.join('\n'));
  }

  installImageFallback();
  const { default: App } = await import('./App');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // Look for a new book at most once an hour while the app is open (same cadence as app
  // updates). A new version is applied by reloading when nobody is using the tablet: the data
  // never changes in the middle of a sale.
  const stop = watchForUpdates({
    update: async () => {
      if (!(await bookChanged(url, source.version))) return;
      stop();
      reloadWhenIdle();
    },
  });

  if (source.kind !== 'sample') void warmPhotos(remotePhotos(book));
}

void boot();
