/**
 * Navigationstest: Zählerstand
 * 
 * Testet den kompletten Ablauf:
 * 1. Initiale Navigation öffnen
 * 2. Klick auf "Immobilien"
 * 3. Suche nach "Zählerstand" in der Sidebar
 * 4. Klick auf "Zählerstand"
 * 5. Überprüfung der neuen Features
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import App from '../renderer/App';

// Mock für alle externen Abhängigkeiten
jest.mock('../renderer/utils/ableseProtokollPdf', () => ({
  createAbleseprotokollPDF: jest.fn(async () => new Uint8Array([1,2,3])),
  createProtokollRows: jest.fn(() => []),
}));

// Mock für localStorage
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

describe('Navigation: Zählerstand Test', () => {
  beforeEach(() => {
    (localStorage as any).clear();
    jest.clearAllMocks();
    
    // Status-Seed: Vorjahr vollständig für Reset-Button-Test
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;
    
    localStorage.setItem('zaehlerstaende_status', JSON.stringify([
      { 
        jahr: prevYear, 
        isComplete: true,  
        completedAt: new Date().toISOString(), 
        meterSnapshot: ['test-meter-1', 'test-meter-2'] 
      }
    ]));
  });

  it('Navigation: Immobilien → Zählerstand → neue Features', async () => {
    const user = userEvent.setup();
    
    // 1. Initiale Navigation öffnen
    render(<App />);
    
    // 2. Simuliere Klick auf "Immobilien"
    const immoButton = screen.getByRole('button', { name: /Immobilien/i });
    await act(async () => {
      await user.click(immoButton);
    });
    
    // Warten bis die Sidebar geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // 3. Überprüfung Navigationseintrag - Suche nach "Zählerstand" als Link
    const zaehlerstandLink = screen.getByRole('link', { name: /Zählerstand/i });
    
    if (zaehlerstandLink) {
      console.log('✅ Navigationseintrag gefunden: "Zählerstand" als Link');
      
      // 4. Klick auf "Zählerstand"
      await act(async () => {
        await user.click(zaehlerstandLink);
      });
      
      // Warten bis die Komponente geladen ist
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // 5. Überprüfung der neuen Features - mit findByRole für Stabilität
      // Überschrift "Ablesung" (Singular) vorhanden - H1 Level
      const heading = await screen.findByRole('heading', { name: /^Ablesung$/i, level: 1 });
      expect(heading).toBeInTheDocument();
      
      // Buttons mit Text "Ablesung" - robuste Suche für mehrere Buttons
      const ablesungButtons = await screen.findAllByRole('button', { name: /^Ablesung$/i });
      expect(ablesungButtons.length).toBeGreaterThan(0);
      
      // PDF-Button - exakter Text
      const pdfButtons = await screen.findAllByRole('button', { name: /^Ableseprotokoll \(PDF\)$/i });
      expect(pdfButtons.length).toBeGreaterThan(0);
      
      // Mindestens ein Status-Badge (grün/rot) vorhanden - mit data-testid
      const statusBadges = await screen.findAllByTestId('status-badge');
      expect(statusBadges.length).toBeGreaterThan(0);
      
      // Reset-Button (↺) sichtbar bei vollständigen Jahren
      const resetButtons = await screen.findAllByRole('button', { name: /↺|Reset/i });
      expect(resetButtons.length).toBeGreaterThan(0);
      
      console.log('✅ Navigationseintrag korrekt: "Zählerstand" → Seite mit neuen Features geladen');
      
    } else {
      // Fehlerfall: "Zählerstände" gefunden
      console.log('❌ Falscher Navigationseintrag gefunden: "Zählerstände"');
      
      // Suche im Projekt nach der Quelle
      const zaehlerstaendeText = screen.queryByText(/Zählerstände/i);
      if (zaehlerstaendeText) {
        console.log('❌ "Zählerstände" (Plural) in der Sidebar gefunden!');
        
        // Markiere als Fehler
        expect(zaehlerstaendeText).not.toBeInTheDocument();
      }
      
      // Suche nach allen Vorkommen von "Zählerstände" im DOM
      const allTexts = screen.queryAllByText(/Zählerstände/i);
      if (allTexts.length > 0) {
        console.log(`❌ ${allTexts.length} Vorkommen von "Zählerstände" im DOM gefunden!`);
        allTexts.forEach((text, index) => {
          console.log(`  ${index + 1}. Text: "${text.textContent}"`);
        });
      }
      
      // Test sollte fehlschlagen
      expect(zaehlerstandLink).toBeInTheDocument();
    }
  });

  it('Fehleranalyse: Suche nach verbleibenden "Zählerstände" in der Sidebar', async () => {
    render(<App />);
    
    // Klick auf "Immobilien"
    const immoButton = screen.getByRole('button', { name: /Immobilien/i });
    await act(async () => {
      await userEvent.click(immoButton);
    });
    
    // Warten bis die Sidebar geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Suche nach allen Navigationseinträgen mit Text
    const allNavTexts = screen.queryAllByText(/Zählerstände|Zählerstand/i);
    const zaehlerstaendeTexts = allNavTexts.filter(text => 
      text.textContent?.includes('Zählerstände')
    );
    
    if (zaehlerstaendeTexts.length > 0) {
      console.log(`❌ ${zaehlerstaendeTexts.length} Navigationseinträge mit "Zählerstände" gefunden:`);
      zaehlerstaendeTexts.forEach((text, index) => {
        console.log(`  ${index + 1}. Text: "${text.textContent}"`);
        const parentLink = text.closest('a');
        if (parentLink) {
          console.log(`     Route: ${parentLink.getAttribute('href')}`);
        }
      });
      
      // Test sollte fehlschlagen
      expect(zaehlerstaendeTexts).toHaveLength(0);
    } else {
      console.log('✅ Keine Navigationseinträge mit "Zählerstände" gefunden');
    }
  });

  it('Route-Überprüfung: /zaehler führt zu neuen Features', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    // Direkt zur Route navigieren
    window.location.hash = '#/immobilien/weg-stuttgarter-strasse/zaehler';
    
    // Warten bis die Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Überprüfung der neuen Features - mit findByRole für Stabilität
    // Überschrift "Ablesung" (Singular) - H1 Level
    const heading = await screen.findByRole('heading', { name: /^Ablesung$/i, level: 1 });
    expect(heading).toBeInTheDocument();
    
    // Buttons (verwende findAllByRole für mehrere Buttons) - robuste Selektoren
    const ablesungButtons = await screen.findAllByRole('button', { name: /^Ablesung$/i });
    expect(ablesungButtons.length).toBeGreaterThan(0);
    
    const pdfButtons = await screen.findAllByRole('button', { name: /^Ableseprotokoll \(PDF\)$/i });
    expect(pdfButtons.length).toBeGreaterThan(0);
    
    // Status-Badges - mit data-testid
    const statusBadges = await screen.findAllByTestId('status-badge');
    expect(statusBadges.length).toBeGreaterThan(0);
    
    // Reset-Buttons - als Button mit Name
    const resetButtons = await screen.findAllByRole('button', { name: /↺|Reset/i });
    expect(resetButtons.length).toBeGreaterThan(0);
    
    console.log('✅ Route /zaehler funktioniert korrekt mit neuen Features');
  });

  it('Untermenü: Zählerübersicht ist sichtbar und funktional', async () => {
    render(<App />);
    
    // Direkt zur Route navigieren, wo die Sidebar sichtbar sein sollte
    window.location.hash = '#/immobilien/weg-stuttgarter-strasse/zaehler';
    
    // Warten bis die Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });
    
    // Überprüfung: Untermenü "Zählerübersicht" ist sichtbar
    const zaehleruebersichtLink = await screen.findByRole('link', { name: /Zählerübersicht/i });
    expect(zaehleruebersichtLink).toBeInTheDocument();
    
    console.log('✅ Untermenü "Zählerübersicht" ist sichtbar');
  });

  it('Route-Überprüfung: /zaehler/uebersicht führt zu Zählerübersicht', async () => {
    render(<App />);
    
    // Direkt zur Route navigieren
    window.location.hash = '#/immobilien/weg-stuttgarter-strasse/zaehler/uebersicht';
    
    // Warten bis die Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Überprüfung: Überschrift "Zählerübersicht" ist sichtbar
    const heading = await screen.findByRole('heading', { name: /Zählerübersicht/i, level: 1 });
    expect(heading).toBeInTheDocument();
    
    // Überprüfung: Zurück-Button ist vorhanden
    const backButton = screen.getByRole('button', { name: /← Zurück zu Zählerstand/i });
    expect(backButton).toBeInTheDocument();
    
    console.log('✅ Route /zaehler/uebersicht funktioniert korrekt');
  });
});
