/**
 * RTL-Tests für Zählerübersicht Sortierung
 * 
 * Testet die korrekte Reihenfolge von Einheiten und Zählern
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ZaehlerUebersichtPage from '../renderer/components/ZaehlerUebersichtPage';
import { ImmobilienProvider } from '../renderer/contexts/ImmobilienContext';
import { ZaehlerTyp } from '../src/types/zaehler.types';
import { fireEvent } from '@testing-library/react';

// Mock zaehlerService
jest.mock('../src/services/zaehler.service', () => ({
  __esModule: true,
  default: {
    list: jest.fn(),
    listByEinheit: jest.fn(),
    updateNote: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findById: jest.fn(),
    getZaehlerTypen: jest.fn(),
    resetMockData: jest.fn()
  }
}));

// Mock window.confirm und window.alert
global.window.confirm = jest.fn(() => true);
global.window.alert = jest.fn();

// Mock-Daten
const mockEinheiten = [
  { id: 'allgemein', name: 'Allgemein', mieterName: 'Gemeinschaft', ordnung: 0, titel: 'Allgemein', wohnungsnummer: 0 },
  { id: '1', name: '1 Wohnung 1', mieterName: 'Mieter 1', ordnung: 1, wohnungsnummer: 1, titel: 'Wohnung Haus oben' },
  { id: '2', name: '2 Wohnung 2', mieterName: 'Mieter 2', ordnung: 2, wohnungsnummer: 2, titel: 'Wohnung Haus unten' },
  { id: '3', name: '3 Wohnung 3', mieterName: 'Eigentümer', ordnung: 3, wohnungsnummer: 3, titel: 'Wohnung Haus vorne' },
  { id: '4', name: '4 Wohnung 4', mieterName: 'Eigentümer', ordnung: 4, wohnungsnummer: 4, titel: 'Wohnung Keller vorne' }
];

const mockZaehler = [
  {
    id: 'zaehler-1',
    wegId: 'test-weg',
    einheitId: 'allgemein',
    zaehlernummer: 'A001',
    bezeichnung: 'Hauptzähler für das gesamte Gebäude',
    zaehlertyp: 'STROM',
    zaehlertypEinheit: 'kWh',
    standort: 'Keller',
    notiz: 'Hauptzähler für das gesamte Gebäude',
    startwert: null,
    ablesewert: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'zaehler-2',
    wegId: 'test-weg',
    einheitId: '1',
    zaehlernummer: 'A002',
    bezeichnung: 'Wohnungszähler 1',
    zaehlertyp: 'STROM',
    zaehlertypEinheit: 'kWh',
    standort: 'Wohnung 1',
    notiz: 'Zähler für Wohnung 1',
    startwert: null,
    ablesewert: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'zaehler-3',
    wegId: 'test-weg',
    einheitId: 'allgemein',
    zaehlernummer: 'W001',
    bezeichnung: 'Hauptwasserzähler',
    zaehlertyp: 'KALTWASSER',
    zaehlertypEinheit: 'm³',
    standort: 'Keller',
    notiz: 'Hauptwasserzähler für das gesamte Gebäude',
    startwert: null,
    ablesewert: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'zaehler-4',
    wegId: 'test-weg',
    einheitId: '2',
    zaehlernummer: 'WMZ001',
    bezeichnung: 'Wärmemengenzähler Wohnung 2',
    zaehlertyp: 'WMZ_HEIZUNG',
    zaehlertypEinheit: 'MWh',
    standort: 'Wohnung 2',
    notiz: 'Wärmemengenzähler für Heizung',
    startwert: null,
    ablesewert: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

describe('ZaehlerUebersicht - Sortierung', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock zaehlerService methods
    const zaehlerService = require('../src/services/zaehler.service').default;
    
    // Verwende separate Mock-Daten für jeden Test
    const testZaehler = [...mockZaehler];
    const testEinheiten = [...mockEinheiten];
    
    zaehlerService.list.mockResolvedValue(testZaehler);
    zaehlerService.listByEinheit.mockResolvedValue(
      new Map([
        ['allgemein', [testZaehler[0], testZaehler[2]]],
        ['1', [testZaehler[1]]],
        ['2', [testZaehler[3]]],
        ['3', []],
        ['4', []]
      ])
    );
    
    zaehlerService.updateNote.mockResolvedValue({
      ...testZaehler[0],
      notiz: 'Geänderte Notiz',
      updatedAt: '2025-01-02T00:00:00Z'
    });
    
    zaehlerService.create.mockResolvedValue({
      id: 'zaehler-new',
      wegId: 'test-weg',
      einheitId: '3',
      zaehlernummer: 'A003',
      bezeichnung: 'Neuer Zähler',
      zaehlertyp: 'STROM',
      zaehlertypEinheit: 'kWh',
      standort: 'Wohnung 3',
      notiz: 'Neuer Zähler für Wohnung 3',
      startwert: null,
      ablesewert: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    });
    
    zaehlerService.update.mockResolvedValue({
      ...testZaehler[0],
      bezeichnung: 'Geänderte Bezeichnung',
      updatedAt: '2025-01-02T00:00:00Z'
    });
    
    zaehlerService.remove.mockResolvedValue(undefined);
    zaehlerService.findById.mockResolvedValue(testZaehler[0]);
    zaehlerService.getZaehlerTypen.mockReturnValue(['STROM', 'KALTWASSER', 'WARMWASSER', 'WMZ_HEIZUNG', 'WMZ_WARMWASSER', 'SONSTIGES']);
    
    // Verhindere, dass resetMockData echte Daten löscht
    zaehlerService.resetMockData.mockImplementation(() => {
      console.log('[Test] resetMockData aufgerufen - Mock-Implementierung');
    });
  });

  test('Einheiten werden in korrekter Reihenfolge angezeigt', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <ImmobilienProvider>
          <Routes>
            <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
          </Routes>
        </ImmobilienProvider>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(screen.getByText('Einheit: Allgemein')).toBeInTheDocument();
    });

    // Hole alle Einheit-Header
    const einheitHeaders = screen.getAllByText(/Einheit:/);
    expect(einheitHeaders).toHaveLength(5); // 5 Einheiten: Allgemein + 4 Wohnungen

    // Prüfe die Reihenfolge: Allgemein zuerst, dann nach Wohnungsnummer
    expect(einheitHeaders[0]).toHaveTextContent('Einheit: Allgemein');
    expect(einheitHeaders[1]).toHaveTextContent('Einheit: Wohnung Keller vorne'); // Wohnungsnummer 1
    expect(einheitHeaders[2]).toHaveTextContent('Einheit: Wohnung Haus vorne');   // Wohnungsnummer 2
    expect(einheitHeaders[3]).toHaveTextContent('Einheit: Wohnung Haus unten');   // Wohnungsnummer 3
    expect(einheitHeaders[4]).toHaveTextContent('Einheit: Wohnung Haus oben');    // Wohnungsnummer 4
  });

  test('Zähler innerhalb einer Einheit werden nach Zählernummer sortiert', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <ImmobilienProvider>
          <Routes>
            <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
          </Routes>
        </ImmobilienProvider>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(screen.getByText('Einheit: Allgemein')).toBeInTheDocument();
    });

    // Prüfe die Sortierung in der "Allgemein" Einheit
    // Zähler sollten nach Zählernummer sortiert sein: A001, W001
    const allgemeinZaehler = screen.getAllByText(/A001|W001/).filter(el => 
      el.tagName === 'TD' && el.style.fontFamily === 'monospace'
    );
    
    expect(allgemeinZaehler).toHaveLength(2);
    expect(allgemeinZaehler[0]).toHaveTextContent('A001');
    expect(allgemeinZaehler[1]).toHaveTextContent('W001');
  });

  test('Leere Einheiten werden korrekt angezeigt', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <ImmobilienProvider>
          <Routes>
            <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
          </Routes>
        </ImmobilienProvider>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(screen.getByText('Einheit: Allgemein')).toBeInTheDocument();
    });

    // Zähle Einheiten (alle Einheit-Header)
    const einheitHeaders = screen.getAllByText(/Einheit:/);
    const anzahlEinheiten = einheitHeaders.length;
    
    // Zähle leere Einheiten (ohne Zähler)
    const emptyMessages = screen.getAllByText('Keine Zähler vorhanden.');
    const anzahlLeereEinheiten = emptyMessages.length;
    
    // Zähle "Zähler anlegen" Buttons
    const createButtons = screen.getAllByText('+ Zähler anlegen');
    const anzahlCreateButtons = createButtons.length;

    // Bestätige die erwarteten Werte
    expect(anzahlEinheiten).toBe(5); // Allgemein + 4 Wohnungen
    expect(anzahlLeereEinheiten).toBe(2); // Wohnungen 3 und 4 sind leer
    expect(anzahlCreateButtons).toBe(5); // Jede Einheit hat einen Button
  });

  test('Keine Doppelanzeige nach dem Anlegen eines neuen Zählers', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <ImmobilienProvider>
          <Routes>
            <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
          </Routes>
        </ImmobilienProvider>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(screen.getByText('Einheit: Allgemein')).toBeInTheDocument();
    });

    // Zähle die ursprünglichen Zähler
    const originalZaehlerCount = screen.getAllByText(/A001|A002|W001|WMZ001/).filter(el => 
      el.tagName === 'TD' && el.style.fontFamily === 'monospace'
    ).length;

    // Öffne das Modal zum Anlegen eines neuen Zählers
    const createButton = screen.getAllByText('+ Zähler anlegen')[0]; // Erste Einheit
    fireEvent.click(createButton);

    // Warte auf das Modal
    await waitFor(() => {
      expect(screen.getByText('Neuen Zähler anlegen')).toBeInTheDocument();
    });

    // Fülle das Formular aus
    const zaehlernummerInput = screen.getByLabelText('Zählernummer:');
    const bezeichnungInput = screen.getByLabelText('Bezeichnung:');
    const zaehlertypSelect = screen.getByLabelText('Zählertyp:');

    fireEvent.change(zaehlernummerInput, { target: { value: 'TEST001' } });
    fireEvent.change(bezeichnungInput, { target: { value: 'Test Zähler' } });
    fireEvent.change(zaehlertypSelect, { target: { value: 'STROM' } });

    // Speichere den Zähler
    const saveButton = screen.getByText('Speichern');
    fireEvent.click(saveButton);

    // Warte auf das Schließen des Modals
    await waitFor(() => {
      expect(screen.queryByText('Neuen Zähler anlegen')).not.toBeInTheDocument();
    });

    // Warte auf die Aktualisierung der UI
    await waitFor(() => {
      const newZaehlerCount = screen.getAllByText(/A001|A002|W001|WMZ001|TEST001/).filter(el => 
        el.tagName === 'TD' && el.style.fontFamily === 'monospace'
      ).length;
      
      // WICHTIG: Es sollte genau ein Zähler mehr sein, nicht zwei!
      expect(newZaehlerCount).toBe(originalZaehlerCount + 1);
    });

    // Prüfe, dass der neue Zähler nur einmal angezeigt wird
    const testZaehlerElements = screen.getAllByText('TEST001');
    expect(testZaehlerElements).toHaveLength(1); // Nur einmal, nicht doppelt!
  });

  test('Bereinigung von Duplikaten in der Datenbank', async () => {
    // Mock zaehlerService mit Duplikaten
    const zaehlerService = require('../src/services/zaehler.service').default;
    
    // Simuliere Duplikate in der Datenbank
    const duplicateZaehler = [
      {
        id: 'zaehler-duplicate-1',
        wegId: 'test-weg',
        einheitId: '1',
        zaehlernummer: 'DUPLICATE001',
        bezeichnung: 'Duplikat 1',
        zaehlertyp: 'STROM',
        zaehlertypEinheit: 'kWh',
        standort: 'Test',
        notiz: 'Erster Eintrag',
        startwert: null,
        ablesewert: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'zaehler-duplicate-2',
        wegId: 'test-weg',
        einheitId: '1',
        zaehlernummer: 'DUPLICATE001',
        bezeichnung: 'Duplikat 2',
        zaehlertyp: 'STROM',
        zaehlertypEinheit: 'kWh',
        standort: 'Test',
        notiz: 'Zweiter Eintrag (neuer)',
        startwert: null,
        ablesewert: null,
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z'
      }
    ];
    
    zaehlerService.list.mockResolvedValue(duplicateZaehler);
    
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <ImmobilienProvider>
          <Routes>
            <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
          </Routes>
        </ImmobilienProvider>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(screen.getByText('Einheit: Wohnung Haus oben')).toBeInTheDocument();
    });

    // Prüfe, dass nur ein Zähler mit der Nummer DUPLICATE001 angezeigt wird
    const duplicateElements = screen.getAllByText('DUPLICATE001');
    expect(duplicateElements).toHaveLength(1); // Nur einer, nicht beide!
    
    // Prüfe, dass der neueste (zweite) Eintrag angezeigt wird
    expect(screen.getByText('Duplikat 2')).toBeInTheDocument();
    expect(screen.queryByText('Duplikat 1')).not.toBeInTheDocument();
  });
});
