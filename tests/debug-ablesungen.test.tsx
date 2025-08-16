/**
 * Debug-Test: Findet die Fehler in der Ablesungen-Übersicht
 * 
 * Dieser Test überprüft:
 * 1. Welche Komponente tatsächlich geladen wird
 * 2. Welche Texte angezeigt werden
 * 3. Welche Buttons vorhanden sind
 * 4. Ob die gewünschten Features implementiert sind
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import App from '../renderer/App';

// Mock für alle externen Abhängigkeiten
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

describe('Debug: Ablesungen-Übersicht Fehler finden', () => {
  beforeEach(() => {
    (localStorage as any).clear();
    jest.clearAllMocks();
  });

  it('DEBUG: Zeigt alle sichtbaren Elemente und findet die Fehler', async () => {
    render(<App />);
    
    // 1. Zur Immobilien-Seite navigieren
    const immoButton = screen.getByRole('button', { name: /Immobilien/i });
    await act(async () => { fireEvent.click(immoButton); });
    
    // 2. Zu den Zählerständen navigieren
    const zaehlerLink = screen.getByRole('link', { name: /Zählerstände/i });
    await act(async () => { fireEvent.click(zaehlerLink); });
    
    // 3. Alle sichtbaren Überschriften auflisten
    const headings = screen.getAllByRole('heading');
    console.log('=== ALLE ÜBERSCHRIFTEN ===');
    headings.forEach((h, i) => {
      console.log(`${i + 1}. Level ${h.tagName}: "${h.textContent}"`);
    });
    
    // 4. Alle sichtbaren Buttons auflisten
    const buttons = screen.getAllByRole('button');
    console.log('=== ALLE BUTTONS ===');
    buttons.forEach((b, i) => {
      console.log(`${i + 1}. "${b.textContent}" (${b.className})`);
    });
    
    // 5. Alle sichtbaren Links auflisten
    const links = screen.getAllByRole('link');
    console.log('=== ALLE LINKS ===');
    links.forEach((l, i) => {
      console.log(`${i + 1}. "${l.textContent}" -> ${l.getAttribute('href')}`);
    });
    
    // 6. Spezifische Überprüfungen
    console.log('=== SPEZIFISCHE ÜBERPRÜFUNGEN ===');
    
    // Überschrift
    const mainHeading = screen.queryByRole('heading', { level: 1 });
    if (mainHeading) {
      console.log(`Hauptüberschrift: "${mainHeading.textContent}"`);
      console.log(`Erwartet: "Ablesung" (Singular)`);
      console.log(`Tatsächlich: "${mainHeading.textContent}"`);
      console.log(`Korrekt: ${mainHeading.textContent === 'Ablesung'}`);
    } else {
      console.log('❌ KEINE Hauptüberschrift gefunden!');
    }
    
    // Buttons mit "Ablesung" vs "Ablesungen"
    const ablesungButtons = screen.queryAllByRole('button', { name: /Ablesung/i });
    const ablesungenButtons = screen.queryAllByRole('button', { name: /Ablesungen/i });
    
    console.log(`Buttons mit "Ablesung": ${ablesungButtons.length}`);
    console.log(`Buttons mit "Ablesungen": ${ablesungenButtons.length}`);
    
    if (ablesungenButtons.length > 0) {
      console.log('❌ FEHLER: Buttons mit "Ablesungen" (Plural) gefunden!');
      ablesungenButtons.forEach((b, i) => {
        console.log(`  ${i + 1}. "${b.textContent}"`);
      });
    }
    
    // Status-Badges suchen
    const vollstaendigBadges = screen.queryAllByText(/Vollständig erfasst/i);
    const nichtVollstaendigBadges = screen.queryAllByText(/Nicht vollständig/i);
    
    console.log(`Status-Badges "Vollständig erfasst": ${vollstaendigBadges.length}`);
    console.log(`Status-Badges "Nicht vollständig": ${nichtVollstaendigBadges.length}`);
    
    if (vollstaendigBadges.length === 0 && nichtVollstaendigBadges.length === 0) {
      console.log('❌ FEHLER: Keine Status-Badges gefunden!');
    }
    
    // PDF-Buttons suchen
    const pdfButtons = screen.queryAllByText(/Ableseprotokoll.*PDF/i);
    console.log(`PDF-Buttons: ${pdfButtons.length}`);
    
    if (pdfButtons.length === 0) {
      console.log('❌ FEHLER: Keine PDF-Buttons gefunden!');
    }
    
    // Reset-Buttons suchen
    const resetButtons = screen.queryAllByText('↺');
    console.log(`Reset-Buttons (↺): ${resetButtons.length}`);
    
    if (resetButtons.length === 0) {
      console.log('❌ FEHLER: Keine Reset-Buttons gefunden!');
    }
    
    // 7. Komponenten-Name überprüfen
    console.log('=== KOMPONENTEN-ÜBERPRÜFUNG ===');
    
    // Prüfen, ob die richtige Komponente geladen wurde
    const debugInfo = screen.queryByText(/\[Ablesungen\] mounted/i);
    if (debugInfo) {
      console.log('✅ ZaehlerstaendeOverview Komponente geladen');
    } else {
      console.log('❌ ZaehlerstaendeOverview Komponente NICHT geladen!');
    }
    
    // 8. Zusammenfassung der Fehler
    console.log('=== FEHLER-ZUSAMMENFASSUNG ===');
    
    const errors = [];
    if (mainHeading && mainHeading.textContent !== 'Ablesung') {
      errors.push(`Hauptüberschrift: "${mainHeading.textContent}" statt "Ablesung"`);
    }
    if (ablesungenButtons.length > 0) {
      errors.push(`${ablesungenButtons.length} Buttons mit "Ablesungen" (Plural) gefunden`);
    }
    if (vollstaendigBadges.length === 0 && nichtVollstaendigBadges.length === 0) {
      errors.push('Keine Status-Badges gefunden');
    }
    if (pdfButtons.length === 0) {
      errors.push('Keine PDF-Buttons gefunden');
    }
    if (resetButtons.length === 0) {
      errors.push('Keine Reset-Buttons gefunden');
    }
    if (!debugInfo) {
      errors.push('ZaehlerstaendeOverview Komponente nicht geladen');
    }
    
    if (errors.length === 0) {
      console.log('✅ Alle Features korrekt implementiert!');
    } else {
      console.log('❌ Gefundene Fehler:');
      errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    // Test schlägt fehl, wenn Fehler gefunden wurden
    expect(errors.length).toBe(0);
  });
});
