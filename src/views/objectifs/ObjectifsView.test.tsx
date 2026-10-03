import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from '../../state/store';
import { RemarquesView } from '../remarques/RemarquesView';
import { ObjectifsView } from './ObjectifsView';

afterEach(cleanup);

describe('ObjectifsView', () => {
  it('with the sample data: says the targets come from the BO (FR / NL)', () => {
    render(<AppProvider initial={{ lang: 0, view: 'obj' }}><ObjectifsView /></AppProvider>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Objectifs');
    expect(screen.getByText(/Les objectifs viennent du back-office/)).toBeTruthy();
    cleanup();
    render(<AppProvider initial={{ lang: 1, view: 'obj' }}><ObjectifsView /></AppProvider>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Doelen');
  });
});

describe('RemarquesView', () => {
  it('the page title, then the remark form', () => {
    render(<AppProvider initial={{ lang: 0, view: 'rem' }}><RemarquesView /></AppProvider>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Remarques clients');
    expect(screen.getByRole('form', { name: "Remarque d'un client" })).toBeTruthy();
  });
});
