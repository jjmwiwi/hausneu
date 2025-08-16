/**
 * UI-Check: Ablesungen-Übersicht
 * - Überschrift "Ablesungen"
 * - Button-Text "Ablesung" (nicht "Ablesungen")
 * - Button "Ableseprotokoll (PDF)" pro Jahr
 * - Status-Badges: "Vollständig erfasst" (grün) / "Nicht vollständig" (rot)
 * - PDF-Export-Handler wird aufgerufen
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import App from '../renderer/App';

// ⛳️ ggf. Pfade anpassen
// Wir mocken die PDF-Funktion, um den Aufruf zu verifizieren:
const pdfMock = jest.fn(async () => new Uint8Array([1,2,3]));
jest.mock('../renderer/utils/ableseProtokollPdf', () => ({
  createAbleseprotokollPDF: (...args: any[]) => (pdfMock as any)(...args),
}));

// localStorage-Mock (Node/CI)
beforeAll(() => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
      _dump: () => store
    };
  })();
  Object.defineProperty(global, 'localStorage', { value: localStorageMock });
});

const go = async (label: RegExp | string) =>
  act(async () => { fireEvent.click(screen.getByText(label)); });

describe('Ablesungen-Übersicht – Buttons, Badges, PDF', () => {
  const year = new Date().getFullYear();
  const prev = year - 1;

  beforeEach(() => {
    // 🧹 Reset
    (localStorage as any).clear();
    pdfMock.mockClear();

    // Seed: Status-Speicher so füllen, dass prev "vollständig" ist, current "nicht vollständig"
    // KEY muss zum Storage passen: 'zaehlerstaende_status'
    const statusSeed = [
      { jahr: prev, isComplete: true,  completedAt: new Date().toISOString(), meterSnapshot: ['123','456'] },
      // aktuelles Jahr absichtlich NICHT vollständig:
      // { jahr: year, isComplete: false }
    ];
    localStorage.setItem('zaehlerstaende_status', JSON.stringify(statusSeed));

    // Optional: weitere Seeds (Zähler/Einheiten) sind für die Übersicht nicht nötig
  });

  it('zeigt Überschrift, pro Jahr "Ablesung"-Button, PDF-Button und korrekte Status-Badges', async () => {
    render(<App />);

    // Navi zur Seite
    await go(/Zählerstände/i);

    // 1) Überschrift
    expect(screen.getByRole('heading', { name: /Ablesungen/i })).toBeInTheDocument();

    // 2) Es darf KEIN Button mit "Ablesungen" (Plural) existieren
    expect(screen.queryByText(/Ablesungen\b/)).not.toBeInTheDocument();

    // 3) Karten/Zeilen für beide Jahre finden
    const currentCard = screen.getByText(new RegExp(`Zeitraum\\s+${year}`, 'i')).closest('div');
    const prevCard    = screen.getByText(new RegExp(`Zeitraum\\s+${prev}`, 'i')).closest('div');
    expect(currentCard).toBeTruthy();
    expect(prevCard).toBeTruthy();

    // 4) In jeder Karte: Button "Ablesung" & "Ableseprotokoll (PDF)"
    const assertCardHasButtons = (card: Element) => {
      expect(within(card).getByText(/Ablesung\b/i)).toBeInTheDocument();
      expect(within(card).getByText(/Ableseprotokoll\s*\(PDF\)/i)).toBeInTheDocument();
    };
    assertCardHasButtons(currentCard!);
    assertCardHasButtons(prevCard!);

    // 5) Status-Badges prüfen:
    // prev = vollständig
    expect(within(prevCard!).getByText(/Vollständig erfasst/i)).toBeInTheDocument();
    // current = nicht vollständig
    expect(within(currentCard!).getByText(/Nicht vollständig/i)).toBeInTheDocument();

    // 6) PDF-Button klicken → PDF-Handler wird aufgerufen
    const pdfBtn = within(currentCard!).getByText(/Ableseprotokoll\s*\(PDF\)/i);
    await act(async () => { fireEvent.click(pdfBtn); });
    expect(pdfMock).toHaveBeenCalledTimes(1);

    // Optional: prüfen, dass wir die Funktion mit einem rows-Array und dem Jahr aufrufen
    const callArgs = pdfMock.mock.calls[0][0];
    expect(callArgs).toHaveProperty('jahr', year);
    expect(callArgs).toHaveProperty('rows'); // Inhalt hängt von euren Daten ab
  });
});
