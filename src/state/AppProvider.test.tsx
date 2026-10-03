import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../shell/AppShell';
import { AppProvider } from './AppProvider';
import { useApp, type Actions, type AppState } from './appState';

/** Gives the test the store actions and the computed layout. */
let api: { actions: Actions; compact: boolean; state: AppState };
function Probe() {
  const ctx = useApp();
  useEffect(() => {
    api = ctx;
  });
  return null;
}

/** Sets the viewport width and notifies listeners, like a rotation or a Split View resize. */
const resize = (w: number) => act(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  window.dispatchEvent(new Event('resize'));
});

const renderApp = (width: number, initial: Partial<AppState> = {}) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  return render(
    <AppProvider initial={{ lang: 0, ...initial }}>
      <AppShell><p>page</p></AppShell>
      <Probe />
    </AppProvider>,
  );
};

afterEach(cleanup);

/** Visible items of the search row: the field, plus the date in landscape. */
const headerItems = () => [...document.querySelector('header')!.children].filter(c => !c.classList.contains('sr-only'));

describe('AppProvider — layout', () => {
  it('switches between landscape (≥ 1000 px) and portrait when the width crosses 1000 px', () => {
    renderApp(1280);
    expect(api.compact).toBe(false);
    expect(headerItems()).toHaveLength(2); // search field + date
    resize(999);
    expect(api.compact).toBe(true);
    expect(headerItems()).toHaveLength(1); // no room for the date
    resize(1000);
    expect(api.compact).toBe(false);
    expect(headerItems()).toHaveLength(2);
  });

  it('keeps the same navigation on both sides of 1000 px: tab bar and "Plus", no sidebar', () => {
    renderApp(1280);
    for (const w of [1280, 999, 1000]) {
      resize(w);
      expect(screen.queryByRole('complementary')).toBeNull();
      expect(screen.getAllByRole('navigation')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Plus' })).toBeTruthy();
    }
  });

  it('reads the layout width through a media query, not innerWidth on every render (iOS pinch-zoom)', () => {
    renderApp(1194);
    expect(api.compact).toBe(false);
    // What WebKit reports after a pinch-zoom: innerWidth shrinks but nothing changes the
    // layout viewport, so the width media query still matches.
    const real = window.matchMedia;
    window.matchMedia = (q: string) => ({ ...real(q), matches: true }) as MediaQueryList;
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 918 });
      act(() => api.actions.setCat('vien')); // any re-render
      expect(api.state.cat).toBe('vien');
      expect(api.compact).toBe(false);
    } finally {
      window.matchMedia = real;
    }
  });
});

describe('AppProvider — "Plus" sheet across a rotation', () => {
  it('the sheet stays open on rotation; a product opened then is the only dialog, in both orientations', () => {
    renderApp(820, { more: true });
    expect(screen.getByRole('dialog', { name: 'Plus' })).toBeTruthy();

    resize(1180); // rotate to landscape: the sheet is the navigation there too, it stays…
    expect(screen.getByRole('dialog', { name: 'Plus' })).toBeTruthy();
    act(() => api.actions.openProduct('croissant')); // …a product is opened (closes the sheet)…
    expect(api.state.more).toBe(false);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    resize(820); // …and the tablet goes back to portrait.

    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialogs[0].contains(document.activeElement)).toBe(true);

    // One Escape closes the product sheet only, and nothing is left open.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(api.state).toMatchObject({ sel: null, more: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
