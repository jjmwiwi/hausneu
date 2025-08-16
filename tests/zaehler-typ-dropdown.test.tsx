/**
 * RTL-Tests für Zählertyp-Dropdown
 * 
 * Testet dass das Dropdown exakt die 6 neuen Enum-Typen enthält (ohne HKV)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ZaehlerUebersichtPage from '../renderer/components/ZaehlerUebersichtPage';
import { ZaehlerTyp, ZAHLERTYP_LABEL } from '../src/types/zaehler.types';

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
  { id: 'allgemein', name: 'Allgemein', mieterName: 'Gemeinschaft' },
  { id: '1', name: '1 Wohnung 1', mieterName: 'Mieter 1', ordnung: 1, wohnungsnummer: 1 }
];

const mockZaehler = [
  {
    id: 'zaehler-1',
    einheitId: 'allgemein',
    zaehlernummer: 'A001',
    bezeichnung: 'Test Zähler',
    zaehlertyp: ZaehlerTyp.STROM,
    standort: 'Keller',
    notiz: 'Test',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

describe('Zählertyp-Dropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock zaehlerService methods
    const zaehlerService = require('../src/services/zaehler.service').default;
    zaehlerService.list.mockResolvedValue(mockZaehler);
    zaehlerService.listByEinheit.mockResolvedValue(
      new Map([
        ['allgemein', [mockZaehler[0]]],
        ['1', []]
      ])
    );
  });

  test('Dropdown enthält exakt die 6 neuen Zählertypen ohne HKV', async () => {
    const user = userEvent.setup();
    
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <Routes>
          <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await screen.findByText('Einheit: Allgemein');

    // Klicke auf "Zähler anlegen" um das Modal zu öffnen
    const createButtons = screen.getAllByText('+ Zähler anlegen');
    await user.click(createButtons[0]);

    // Modal sollte geöffnet sein
    expect(screen.getByText('Neuen Zähler anlegen')).toBeInTheDocument();

    // Finde das Zählertyp-Dropdown
    const zaehlertypSelect = screen.getByRole('combobox', { name: /Zählertyp/i });
    expect(zaehlertypSelect).toBeInTheDocument();

    // Öffne das Dropdown
    await user.click(zaehlertypSelect);

    // Prüfe dass alle 6 neuen Typen vorhanden sind
    const expectedOptions = [
      'Strom (kWh)',
      'Kaltwasser (m³)',
      'Warmwasser (m³)',
      'Wärmemenge Heizung (MWh)',
      'Wärmemenge Warmwasser (MWh)',
      'Sonstiges'
    ];

    expectedOptions.forEach(option => {
      expect(screen.getByRole('option', { name: option })).toBeInTheDocument();
    });

    // Prüfe dass keine alten Typen vorhanden sind
    const oldOptions = [
      'Heizkostenverteiler',
      'HKV',
      'Wasser',
      'Wasser (m³)'
    ];

    oldOptions.forEach(option => {
      expect(screen.queryByRole('option', { name: option })).not.toBeInTheDocument();
    });

    // Prüfe dass die Anzahl exakt 6 ist
    const zaehlertypSelectElement = screen.getByLabelText('Zählertyp');
    const zaehlertypOptions = zaehlertypSelectElement.querySelectorAll('option');
    expect(zaehlertypOptions).toHaveLength(6);
  });

  test('Dropdown verwendet ZAHLERTYP_LABEL für die Anzeige', async () => {
    const user = userEvent.setup();
    
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <Routes>
          <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten
    await screen.findByText('Einheit: Allgemein');

    // Klicke auf "Zähler anlegen" um das Modal zu öffnen
    const createButtons = screen.getAllByText('+ Zähler anlegen');
    await user.click(createButtons[0]);

    // Modal sollte geöffnet sein
    expect(screen.getByText('Neuen Zähler anlegen')).toBeInTheDocument();

    // Finde das Zählertyp-Dropdown
    const zaehlertypSelect = screen.getByRole('combobox', { name: /Zählertyp/i });
    
    // Prüfe dass der Standardwert korrekt ist
    expect(zaehlertypSelect).toHaveValue('STROM');

    // Prüfe dass alle Labels aus ZAHLERTYP_LABEL verwendet werden
    Object.entries(ZAHLERTYP_LABEL).forEach(([key, label]) => {
      const option = screen.getByRole('option', { name: label });
      expect(option).toHaveValue(key);
    });
  });
});
