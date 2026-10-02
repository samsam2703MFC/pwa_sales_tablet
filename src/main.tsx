import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import './pwa/register';
import App from './App';
import { BOOK } from './data/book';
import { validateBook } from './data/validate';

// Development only (removed from the production build): flag broken ids in the book at once.
if (import.meta.env.DEV) {
  const errors = validateBook(BOOK);
  if (errors.length) console.error('Book invalide :\n' + errors.join('\n'));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
