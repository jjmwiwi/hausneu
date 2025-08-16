/**
 * Test für Zähler-Purge-Funktionalität
 * 
 * Testet dass alle Zähler für eine WEG gelöscht werden können
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import ZaehlerUebersichtPage from '../renderer/components/ZaehlerUebersichtPage';
import { ZaehlerTyp } from '../src/types/zaehler.types';

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
    resetMockData: jest.fn(),
    purgeAll: jest.fn()
  }
}));

// Mock ImmobilienContext
jest.mock('../renderer/contexts/ImmobilienContext', () => ({
  useImmobilien: () => ({
    wegEinheiten: [
      { id: '1', titel: 'Wohnung 1', wohnungsnummer: 1, mieter: 'Mieter 1' },
      { id: '2', titel: 'Wohnung 2', wohnungsnummer: 2, mieter: 'Mieter 2' }
    ]
  })
}));

// Mock window.confirm und window.alert
global.window.confirm = jest.fn(() => true);
global.window.alert = jest.fn();

// Mock process.env.NODE_ENV
const originalEnv = process.env.NODE_ENV;
beforeAll(() => {
  process.env.NODE_ENV = 'development';
});

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

describe('Zähler-Purge', () => {
  const mockZaehler = [
    {
      id: 'zaehler-1',
      einheitId: 'allgemein',
      zaehlernummer: 'A001',
      bezeichnung: 'Hauptzähler',
      zaehlertyp: ZaehlerTyp.STROM,
      standort: 'Keller',
      notiz: 'Test',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    {
      id: 'zaehler-2',
      einheitId: '1',
      zaehlernummer: 'W001',
      bezeichnung: 'Wohnungszähler 1',
      zaehlertyp: ZaehlerTyp.KALTWASSER,
      standort: 'Wohnung 1',
      notiz: 'Test',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    {
      id: 'zaehler-3',
      einheitId: '2',
      zaehlernummer: 'WMZ001',
      bezeichnung: 'Wärmemengenzähler',
      zaehlertyp: ZaehlerTyp.WMZ_HEIZUNG,
      standort: 'Wohnung 2',
      notiz: 'Test',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock zaehlerService
    const zaehlerService = require('../src/services/zaehler.service').default;
    zaehlerService.list.mockResolvedValue(mockZaehler);
    zaehlerService.listByEinheit.mockResolvedValue(
      new Map([
        ['allgemein', [mockZaehler[0]]],
        ['1', [mockZaehler[1]]],
        ['2', [mockZaehler[2]]]
      ])
    );
    zaehlerService.purgeAll.mockResolvedValue(3);
  });

  test('Purge-Button ist in Development-Modus sichtbar', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <Routes>
          <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(screen.getByText('Einheit: Allgemein')).toBeInTheDocument();
    });

    // Prüfe dass der Purge-Button sichtbar ist
    expect(screen.getByText(/🗑️ Alle Zähler löschen \(3\)/)).toBeInTheDocument();
  });

  test('Purge löscht alle Zähler und lädt die Seite neu', async () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <Routes>
          <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(screen.getByText('Einheit: Allgemein')).toBeInTheDocument();
    });

    // Klicke auf den Purge-Button
    const purgeButton = screen.getByText(/🗑️ Alle Zähler löschen \(3\)/);
    purgeButton.click();

    // Prüfe dass confirm aufgerufen wurde
    expect(window.confirm).toHaveBeenCalledWith('ALLE Zähler für diese WEG löschen? Dies kann nicht rückgängig gemacht werden!');

    // Prüfe dass purgeAll aufgerufen wurde
    const zaehlerService = require('../src/services/zaehler.service').default;
    expect(zaehlerService.purgeAll).toHaveBeenCalledWith('test-weg');

    // Prüfe dass alert mit der Anzahl der gelöschten Zähler aufgerufen wurde
    expect(window.alert).toHaveBeenCalledWith('3 Zähler gelöscht. Seite wird neu geladen.');

    // Prüfe dass die Seite neu geladen wird
    expect(mockReload).toHaveBeenCalled();
  });

  test('Purge-Button ist in Production-Modus nicht sichtbar', async () => {
    // Temporär auf Production setzen
    process.env.NODE_ENV = 'production';

    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <Routes>
          <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(screen.getByText('Einheit: Allgemein')).toBeInTheDocument();
    });

    // Prüfe dass der Purge-Button NICHT sichtbar ist
    expect(screen.queryByText(/🗑️ Alle Zähler löschen/)).not.toBeInTheDocument();

    // Zurück auf Development setzen
    process.env.NODE_ENV = 'development';
  });
});
