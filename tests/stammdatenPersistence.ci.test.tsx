/**
 * Test: Stammdaten – kein Freeze nach Speichern & PLZ-Persistenz
 * - CI-fähig (headless, ohne Electron)
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { HashRouter } from 'react-router-dom';
import { ImmobilienProvider } from '../renderer/contexts/ImmobilienContext';
import StammdatenPage from '../renderer/components/StammdatenPage';

// Storage Mocks
import {
  clearWEGEinheiten,
  saveWEGEinheiten,
  loadWEGEinheiten,
} from '../renderer/storage/wegEinheitenStorage';

import {
  clearStammdaten,
  saveStammdaten,
  loadStammdaten,
} from '../renderer/storage/stammdatenStorage';

// ---- localStorage Mock (Node/CI) ----
beforeAll(() => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
    };
  })();
  Object.defineProperty(global, 'localStorage', { value: localStorageMock });
});

// ---- Helpers ----
const go = async (label: RegExp | string) =>
  act(async () => { fireEvent.click(screen.getByText(label)); });

const typeIn = (el: HTMLElement, value: string) => {
  fireEvent.change(el, { target: { value } });
  fireEvent.blur(el);
};

// Mock für useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ wegId: 'weg-stuttgarter-strasse' }),
  useNavigate: () => jest.fn(),
}));

describe('Stammdaten: kein Freeze + PLZ persistiert', () => {
  const wegId = 'weg-stuttgarter-strasse';
  
  // Verwende die Standard-Werte aus dem Context
  const defaultValues = {
    name: 'WEG Stuttgarter Strasse 104',
    address: 'Stuttgarter Strasse 104',
    zip: '71229',
    city: 'Leonberg',
    notes: 'Wohnungseigentümergemeinschaft',
  };

  beforeEach(() => {
    // Ausgangszustand: eine WEG mit Stammdaten verfügbar
    clearWEGEinheiten();
    saveWEGEinheiten([
      {
        id: 'wohnung-1', 
        titel: 'Wohnung Müller unten', 
        wohnungsnummer: 1,
        mieter: 'Jürgen Müller', 
        email: 'jm@example.com', 
        telefon: '0163…',
        flaecheM2: 98.8, 
        miteigentumsAnteil: 10.5
      },
    ]);

    // Stammdaten löschen, damit der Context die Standard-Werte lädt
    clearStammdaten();
  });

  it('friert nach Speichern nicht ein und persistiert PLZ', async () => {
    render(
      <HashRouter>
        <ImmobilienProvider>
          <StammdatenPage />
        </ImmobilienProvider>
      </HashRouter>
    );

    // 1) Warten bis Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // 2) Felder referenzieren - verwende die tatsächlich angezeigten Werte
    const zipInput = screen.getByDisplayValue(defaultValues.zip);
    const cityInput = screen.getByDisplayValue(defaultValues.city);
    const nameInput = screen.getByDisplayValue(defaultValues.name);

    expect(zipInput).toBeInTheDocument();
    expect(cityInput).toBeInTheDocument();
    expect(nameInput).toBeInTheDocument();

    // 3) PLZ ändern und speichern
    const neuePLZ = '70372';
    typeIn(zipInput as HTMLElement, neuePLZ);

    // Speichern-Button klicken
    const saveBtn = screen.getByRole('button', { name: /speichern/i });
    expect(saveBtn).toBeInTheDocument();
    
    await act(async () => fireEvent.click(saveBtn));

    // 4) **Kein Freeze**: direkt danach ein anderes Feld editierbar?
    // Versuch, Stadt sofort zu ändern
    const neueStadt = 'Stuttgart-Bad Cannstatt';
    typeIn(cityInput as HTMLElement, neueStadt);

    // Feld bleibt interaktiv und enthält den neuen Wert
    expect((cityInput as HTMLInputElement).value).toBe(neueStadt);

    // 5) PLZ sollte auch noch den neuen Wert haben
    expect((zipInput as HTMLInputElement).value).toBe(neuePLZ);

    // 6) Speichern und dann erneut bearbeiten
    await act(async () => fireEvent.click(saveBtn));
    
    // Alle Felder sollten weiterhin editierbar sein
    const zipAfterSave = screen.getByDisplayValue(neuePLZ);
    const cityAfterSave = screen.getByDisplayValue(neueStadt);
    
    expect(zipAfterSave).toBeInTheDocument();
    expect(cityAfterSave).toBeInTheDocument();

    // 7) Neuen Wert in PLZ eingeben
    const neuestePLZ = '70469';
    typeIn(zipAfterSave as HTMLElement, neuestePLZ);
    
    expect((zipAfterSave as HTMLInputElement).value).toBe(neuestePLZ);
  });

  it('defensiv: vermeidet Re-Initialisierung nach jedem stammdaten-Update', async () => {
    render(
      <HashRouter>
        <ImmobilienProvider>
          <StammdatenPage />
        </ImmobilienProvider>
      </HashRouter>
    );

    // Warten bis Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Felder referenzieren - verwende die tatsächlich angezeigten Werte
    const zip = screen.getByDisplayValue(defaultValues.zip);
    const name = screen.getByDisplayValue(defaultValues.name);

    expect(zip).toBeTruthy();
    expect(name).toBeTruthy();

    // 2 Felder nacheinander ändern, ohne zwischenzeitlich neu zu mounten
    typeIn(zip as HTMLElement, '70469');
    typeIn(name as HTMLElement, 'WEG Stuttgarter Straße 104 – Test');

    // Wenn ein Loop/Reset läuft, würden die Werte wieder zurückspringen:
    expect((zip as HTMLInputElement).value).toBe('70469');
    expect((name as HTMLInputElement).value).toBe('WEG Stuttgarter Straße 104 – Test');

    // Noch ein weiteres Feld ändern
    const city = screen.getByDisplayValue(defaultValues.city);
    typeIn(city as HTMLElement, 'Neue Stadt');

    // Alle Werte sollten konsistent bleiben
    expect((zip as HTMLInputElement).value).toBe('70469');
    expect((name as HTMLInputElement).value).toBe('WEG Stuttgarter Straße 104 – Test');
    expect((city as HTMLInputElement).value).toBe('Neue Stadt');
  });

  it('persistiert alle Änderungen korrekt', async () => {
    render(
      <HashRouter>
        <ImmobilienProvider>
          <StammdatenPage />
        </ImmobilienProvider>
      </HashRouter>
    );

    // Warten bis Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Alle Felder ändern - verwende die tatsächlich angezeigten Werte
    const zip = screen.getByDisplayValue(defaultValues.zip);
    const city = screen.getByDisplayValue(defaultValues.city);
    const name = screen.getByDisplayValue(defaultValues.name);
    const notes = screen.getByDisplayValue(defaultValues.notes);

    typeIn(zip as HTMLElement, '99999');
    typeIn(city as HTMLElement, 'Teststadt');
    typeIn(name as HTMLElement, 'Test WEG');
    typeIn(notes as HTMLElement, 'Neue Test Notizen');

    // Speichern
    const saveBtn = screen.getByRole('button', { name: /speichern/i });
    await act(async () => fireEvent.click(saveBtn));

    // Werte sollten gespeichert sein
    expect((zip as HTMLInputElement).value).toBe('99999');
    expect((city as HTMLInputElement).value).toBe('Teststadt');
    expect((name as HTMLInputElement).value).toBe('Test WEG');
    expect((notes as HTMLInputElement).value).toBe('Neue Test Notizen');

    // Storage sollte aktualisiert sein
    const savedStammdaten = loadStammdaten();
    expect(savedStammdaten.zip).toBe('99999');
    expect(savedStammdaten.city).toBe('Teststadt');
    expect(savedStammdaten.name).toBe('Test WEG');
    expect(savedStammdaten.notes).toBe('Neue Test Notizen');
  });
});
