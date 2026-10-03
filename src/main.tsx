import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { reloadWhenIdle, watchForUpdates } from './pwa/register';
import { BOOK, SAMPLE_BOOK, setBook } from './data/book';
import { fetchObjectives, objectivesUrl } from './data/objectives';
import { bookUrl, refreshBook, remotePhotos, startBook } from './data/remote';
import { remarksUrl, startRemarkSync } from './data/remarks';
import { validateBook } from './data/validate';
import { warmPhotos } from './data/warmPhotos';
import { API_ROOT, PUBLIC_ROOT } from './lib/api';
import { installImageFallback } from './lib/asset';
import { config, localStore } from './lib/config';

/**
 * Boot: get the book (the one kept on the device, else the BO's, else the bundled sample),
 * install it, and only then load the app. The views and src/lib/catalog.ts read BOOK when they
 * are first evaluated (catalog lookups) or called (default parameters), so `./App` is imported
 * dynamically AFTER setBook.
 * Nothing imported statically here may import src/lib/catalog.ts.
 */
async function boot() {
  const url = bookUrl(API_ROOT, config.shop);
  const storage = localStore();
  const { book, source, refresh } = await startBook({ url, sample: SAMPLE_BOOK, publicRoot: PUBLIC_ROOT, online: navigator.onLine, storage });
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

  // Ask the BO for its current book right after start-up when the book on screen may be stale
  // (kept on the device, or the sample), then at most once an hour while the app is open (same
  // cadence as app updates). A new book is kept on the device and applied by reloading when
  // nobody is using the tablet: the data never changes in the middle of a sale.
  let reloading = false;
  const check = async () => {
    if (reloading || !(await refreshBook(url, source.version, storage))) return;
    reloading = true;
    stop();
    reloadWhenIdle();
  };
  const stop = watchForUpdates({ update: check });
  if (refresh) void check();

  // Customer remarks typed while offline leave now, and whenever the network comes back.
  startRemarkSync(remarksUrl(API_ROOT), storage);

  if (source.kind !== 'sample') {
    void warmPhotos(remotePhotos(book));
    // The shop's targets, kept on the device: the « Objectifs » page shows them at once, offline too.
    void fetchObjectives(objectivesUrl(API_ROOT, config.shop), storage);
  }
}

void boot();
