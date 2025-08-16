/**
 * Regression-Test: Ablesungen-Übersicht
 * Prüft:
 *  - Überschrift vorhanden
 *  - Button-Text pro Jahr ist "Ablesung" (NICHT "Ablesungen")
 *  - pro Jahr existiert ein Button "Ableseprotokoll (PDF)"
 *  - Status-Badges: "Vollständig erfasst" / "Nicht vollständig"
 *  - Reset-Button (↺) erscheint bei vollständigem Jahr
 *  - PDF-Handler wird beim Klick aufgerufen
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import App from '../renderer/App';

// PDF-Handler mocken
jest.mock('../renderer/utils/ableseProtokollPdf', () => ({
  createAbleseprotokollPDF: jest.fn(async () => new Uint8Array([1,2,3])),
  createProtokollRows: jest.fn(() => []),
}));

beforeAll(() => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
      _dump: () => store,
    };
  })();
  Object.defineProperty(global, 'localStorage', { value: localStorageMock });
});

const go = async (label: RegExp | string) =>
  act(async () => { fireEvent.click(screen.getByText(label)); });

describe('Ablesungen-Übersicht – UI vollständig', () => {
  const year = new Date().getFullYear();
  const prev = year - 1;

  beforeEach(() => {
    (localStorage as any).clear();
    jest.clearAllMocks();
    // Status-Seed: Vorjahr vollständig, aktuelles Jahr unvollständig
    localStorage.setItem('zaehlerstaende_status', JSON.stringify([
      { jahr: prev, isComplete: true,  completedAt: new Date().toISOString(), meterSnapshot: ['x','y'] },
      // aktuelles Jahr absichtlich NICHT vollständig
    ]));
  });

  it('zeigt Überschrift, Buttons "Ablesung", PDF, Badges und Reset', async () => {
    render(<App />);
    
    // Zuerst zur Immobilien-Seite navigieren (Sidebar-Button)
    const immoButton = screen.getByRole('button', { name: /Immobilien/i });
    await act(async () => { fireEvent.click(immoButton); });
    
    // Dann zu den Zählerständen (Sidebar-Link)
    const zaehlerLink = screen.getByRole('link', { name: /Zählerstand/i });
    await act(async () => { fireEvent.click(zaehlerLink); });

    // Überschrift
    expect(screen.getByRole('heading', { name: /Ablesung/i })).toBeInTheDocument();

    // KEIN "Ablesungen" (Plural) im Button
    expect(screen.queryByRole('button', { name: /\bAblesungen\b/i })).not.toBeInTheDocument();

    // Karten finden (nach den Zeitraum-Überschriften)
    const currentCard = screen.getByText(new RegExp(`Zeitraum\\s+${year}`, 'i')).closest('.card')!;
    const prevCard    = screen.getByText(new RegExp(`Zeitraum\\s+${prev}`, 'i')).closest('.card')!;
    expect(currentCard).toBeTruthy();
    expect(prevCard).toBeTruthy();

    // Pro Karte: Button "Ablesung" + "Ableseprotokoll (PDF)"
    const assertButtons = (card: Element) => {
      expect(within(card as HTMLElement).getByRole('button', { name: /\bAblesung\b/i })).toBeInTheDocument();
      expect(within(card as HTMLElement).getByRole('button', { name: /Ableseprotokoll\s*\(PDF\)/i })).toBeInTheDocument();
    };
    assertButtons(currentCard);
    assertButtons(prevCard);

    // Badges
    expect(within(prevCard as HTMLElement).getByText(/Vollständig erfasst/i)).toBeInTheDocument();
    expect(within(currentCard as HTMLElement).getByText(/Nicht vollständig/i)).toBeInTheDocument();

    // Reset-Button nur bei vollständigem Jahr
    expect(within(prevCard as HTMLElement).getByText('↺')).toBeInTheDocument();
    expect(within(currentCard as HTMLElement).queryByText('↺')).not.toBeInTheDocument();

    // PDF-Handler wird aufgerufen
    await act(async () => {
      fireEvent.click(within(currentCard as HTMLElement).getByRole('button', { name: /Ableseprotokoll/i }));
    });
    
    // PDF-Handler wurde aufgerufen
    expect(jest.mocked(require('../renderer/utils/ableseProtokollPdf').createAbleseprotokollPDF)).toHaveBeenCalled();
  });
});
