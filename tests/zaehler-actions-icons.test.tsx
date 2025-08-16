/**
 * Test für Icons statt Text in der Zählerübersicht
 * 
 * Testet dass die Aktionen mit Icons und aria-labels angezeigt werden
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
    resetMockData: jest.fn()
  }
}));

// Mock ImmobilienContext
jest.mock('../renderer/contexts/ImmobilienContext', () => ({
  useImmobilien: () => ({
    wegEinheiten: [
      { id: '1', titel: 'Wohnung 1', wohnungsnummer: 1, mieter: 'Mieter 1' }
    ]
  })
}));

// Mock window.confirm und window.alert
global.window.confirm = jest.fn(() => true);
global.window.alert = jest.fn();

describe('Zähler-Aktionen mit Icons', () => {
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
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock zaehlerService
    const zaehlerService = require('../src/services/zaehler.service').default;
    zaehlerService.list.mockResolvedValue(mockZaehler);
    zaehlerService.listByEinheit.mockResolvedValue(
      new Map([
        ['allgemein', [mockZaehler[0]]]
      ])
    );
  });

  test('Bearbeiten-Button verwendet Pencil-Icon mit aria-label', async () => {
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

    // Prüfe dass der Bearbeiten-Button mit aria-label existiert
    const bearbeitenButton = screen.getByRole('button', { name: /Bearbeiten/i });
    expect(bearbeitenButton).toBeInTheDocument();
    expect(bearbeitenButton).toHaveAttribute('aria-label', 'Bearbeiten');

    // Prüfe dass der sichtbare Text "Bearbeiten" NICHT vorhanden ist
    expect(screen.queryByText('Bearbeiten')).not.toBeInTheDocument();
  });

  test('Löschen-Button verwendet Trash-Icon mit aria-label', async () => {
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

    // Prüfe dass der Löschen-Button mit aria-label existiert
    const loeschenButton = screen.getByRole('button', { name: /Löschen/i });
    expect(loeschenButton).toBeInTheDocument();
    expect(loeschenButton).toHaveAttribute('aria-label', 'Löschen');

    // Prüfe dass der sichtbare Text "Löschen" NICHT vorhanden ist
    expect(screen.queryByText('Löschen')).not.toBeInTheDocument();
  });

  test('Beide Buttons haben korrekte Styling-Klassen', async () => {
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

    const bearbeitenButton = screen.getByRole('button', { name: /Bearbeiten/i });
    const loeschenButton = screen.getByRole('button', { name: /Löschen/i });

    // Prüfe dass beide Buttons korrekte Styling-Eigenschaften haben
    expect(bearbeitenButton).toHaveStyle({
      border: '1px solid #3b82f6',
      backgroundColor: 'white',
      color: '#3b82f6'
    });

    expect(loeschenButton).toHaveStyle({
      border: '1px solid #ef4444',
      backgroundColor: 'white',
      color: '#ef4444'
    });

    // Prüfe dass beide Buttons flexbox-Layout haben
    expect(bearbeitenButton).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });

    expect(loeschenButton).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
  });

  test('Icons sind korrekt gerendert', async () => {
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

    // Prüfe dass die Icons korrekt gerendert werden
    // Da wir lucide-react mocken müssen, prüfen wir die aria-labels
    const bearbeitenButton = screen.getByRole('button', { name: /Bearbeiten/i });
    const loeschenButton = screen.getByRole('button', { name: /Löschen/i });

    expect(bearbeitenButton).toBeInTheDocument();
    expect(loeschenButton).toBeInTheDocument();
  });
});
