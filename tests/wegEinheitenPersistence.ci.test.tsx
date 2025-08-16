/**
 * __tests__/wegEinheitenPersistence.ci.test.tsx
 *
 * Testet Persistenz & Live-Update der WEG-Einheiten in der Zählerübersicht
 * → CI-fähig (headless, ohne echte Electron- oder Browser-APIs)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import App from '../renderer/App';
import {
  saveWEGEinheiten,
  loadWEGEinheiten,
  clearWEGEinheiten
} from '../renderer/storage/wegEinheitenStorage';

// Mock für localStorage in Node-Umgebung
beforeAll(() => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem(key: string) {
        return store[key] || null;
      },
      setItem(key: string, value: string) {
        store[key] = value.toString();
      },
      removeItem(key: string) {
        delete store[key];
      },
      clear() {
        store = {};
      }
    };
  })();
  Object.defineProperty(global, 'localStorage', { value: localStorageMock });
});

// Hilfsfunktion: Mietername aus Storage lesen
const getMieterNameFromStorage = (einheitId: string) => {
  const einheiten = loadWEGEinheiten();
  const einheit = einheiten.find(e => e.id === einheitId);
  return einheit ? einheit.mieter : null;
};

describe('Persistenz & Live-Update WEG-Einheiten (CI)', () => {
  const testEinheitId = '1'; // Wohnung Haus oben Nr. 4
  const originalName = 'Rudolf Klee';
  const neuerName = 'Test Zachert';

  beforeEach(() => {
    clearWEGEinheiten();
    saveWEGEinheiten([
      {
        id: testEinheitId,
        titel: 'Wohnung Haus oben',
        wohnungsnummer: 4,
        mieter: originalName
      }
      // ggf. weitere Einheiten für Test hinzufügen
    ]);
  });

  it('soll Mieteränderung sofort und dauerhaft übernehmen', async () => {
    render(<App />);

    // 1) Navigation zu WEG-Einheiten
    await act(async () => {
      // Klicke auf den Immobilien-Button in der Sidebar
      fireEvent.click(screen.getByRole('button', { name: /Immobilien/i }));
      // Warte kurz und klicke dann auf WEG-Einheiten
      await new Promise(resolve => setTimeout(resolve, 100));
      fireEvent.click(screen.getByText(/WEG-Einheiten/i));
    });

    // Debug: Prüfe ob WEG-Einheiten-Seite geladen wurde (H1-Überschrift)
    expect(screen.getByRole('heading', { name: /WEG-Einheiten/i })).toBeInTheDocument();
    
    // Debug: Zeige alle sichtbaren Texte auf der Seite
    console.log('Alle sichtbaren Texte auf der WEG-Einheiten-Seite:');
    screen.debug();

    // Debug: Prüfe ob die Test-Einheit angezeigt wird
    // expect(screen.getByText('Wohnung Haus oben')).toBeInTheDocument();
    // expect(screen.getByText(originalName)).toBeInTheDocument();

    // 2) Prüfe ob die WEG-Einheiten-Seite korrekt geladen wurde
    // Debug: Zeige alle sichtbaren Texte auf der Seite
    console.log('Alle sichtbaren Texte auf der WEG-Einheiten-Seite nach Navigation:');
    screen.debug();

    // Prüfe ob die WEG-Einheiten-Komponente gerendert wurde (H1-Überschrift)
    expect(screen.getByRole('heading', { name: /WEG-Einheiten/i })).toBeInTheDocument();
    
    // Prüfe ob die Test-Einheit angezeigt wird
    expect(screen.getByText(/Wohnung Haus oben/i)).toBeInTheDocument();
    expect(screen.getByText(originalName)).toBeInTheDocument();

    // 3) Mieter ändern - zuerst auf Edit-Button klicken
    const editButton = screen.getByTitle('Bearbeiten');
    fireEvent.click(editButton);
    
    // Jetzt sollte das Input-Feld sichtbar sein
    const mieterInput = screen.getByDisplayValue(originalName);
    fireEvent.change(mieterInput, { target: { value: neuerName } });
    fireEvent.blur(mieterInput); // Speichern durch Blur

    // 4) Sofortige Anzeige in Zählerübersicht prüfen
    await act(async () => {
      fireEvent.click(screen.getByText(/Zählerstände/i));
      fireEvent.click(screen.getByText(/Zählerübersicht/i));
    });
    expect(screen.getAllByText(neuerName)[0]).toBeInTheDocument();

    // 5) Menüwechsel simulieren - zurück zu WEG-Einheiten und dann wieder zu Zählerübersicht
    await act(async () => {
      // Klicke auf den WEG-Einheiten-Link in der Sidebar (nicht den H1-Titel)
      const wegEinheitenLink = screen.getByRole('link', { name: /WEG-Einheiten/i });
      fireEvent.click(wegEinheitenLink);
      // Klicke auf den Zählerübersicht-Link in der Sidebar (nicht den H1-Titel)
      const zaehlerUebersichtLink = screen.getByRole('link', { name: /Zählerübersicht/i });
      fireEvent.click(zaehlerUebersichtLink);
    });
    expect(screen.getAllByText(neuerName)[0]).toBeInTheDocument();

    // 6) "App-Neustart" simulieren (State reset, Storage laden)
    render(<App />);
    await act(async () => {
      // Direkte Navigation zu Zählerübersicht über die URL
      // Da wir bereits in der WEG-Ansicht sind, können wir direkt den Link klicken
      const zaehlerUebersichtLinks = screen.getAllByRole('link', { name: /Zählerübersicht/i });
      fireEvent.click(zaehlerUebersichtLinks[0]); // Verwende den ersten Link
    });
    expect(screen.getAllByText(neuerName)[0]).toBeInTheDocument();

    // 7) Direkt im Storage prüfen
    expect(getMieterNameFromStorage(testEinheitId)).toBe(neuerName);
  });
});
