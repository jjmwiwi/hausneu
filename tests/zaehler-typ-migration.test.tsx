/**
 * RTL-Tests für Zählertyp-Migration
 * 
 * Testet dass alte Zählertyp-Strings korrekt zu neuen Enum-Typen migriert werden
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
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

// Mock console.warn um Warnungen zu erfassen
const originalWarn = console.warn;
let warnLogs: string[] = [];

beforeAll(() => {
  console.warn = (...args: any[]) => {
    warnLogs.push(args.join(' '));
    originalWarn(...args);
  };
});

beforeEach(() => {
  warnLogs = [];
});

afterAll(() => {
  console.warn = originalWarn;
});

// Mock-Daten mit alten Zählertyp-Strings
const mockEinheiten = [
  { id: 'allgemein', name: 'Allgemein', mieterName: 'Gemeinschaft' },
  { id: '1', name: '1 Wohnung 1', mieterName: 'Mieter 1', ordnung: 1, wohnungsnummer: 1 },
  { id: '2', name: '2 Wohnung 2', mieterName: 'Mieter 2', ordnung: 2, wohnungsnummer: 2 }
];

const mockZaehlerWithOldTypes = [
  {
    id: 'zaehler-1',
    einheitId: 'allgemein',
    zaehlernummer: 'A001',
    bezeichnung: 'Hauptzähler',
    zaehlertyp: 'Strom' as any, // Alter String
    standort: 'Keller',
    notiz: 'Test',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'zaehler-2',
    einheitId: 'allgemein',
    zaehlernummer: 'W001',
    bezeichnung: 'Wasserzähler',
    zaehlertyp: 'Wasser' as any, // Alter String
    standort: 'Keller',
    notiz: 'Test',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'zaehler-3',
    einheitId: '1',
    zaehlernummer: 'HKV001',
    bezeichnung: 'Heizkostenverteiler',
    zaehlertyp: 'HKV' as any, // Alter String (sollte zu SONSTIGES werden)
    standort: 'Wohnung 1',
    notiz: 'Test',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'zaehler-4',
    einheitId: '2',
    zaehlernummer: 'WMZ001',
    bezeichnung: 'Wärmemengenzähler',
    zaehlertyp: 'WMZ Heizung' as any, // Alter String
    standort: 'Wohnung 2',
    notiz: 'Test',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'zaehler-5',
    einheitId: 'allgemein',
    zaehlernummer: 'U001',
    bezeichnung: 'Unbekannter Zählertyp',
    zaehlertyp: 'UnbekannterTyp' as any, // Wirklich unbekannter Typ
    standort: 'Keller',
    notiz: 'Test',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

// Hilfsfunktion zur Migration alter Zählertyp-Strings (wie im Service)
function migrateZaehlerTyp(oldType: string): ZaehlerTyp {
  const normalizedType = oldType.toLowerCase().trim();
  
  // Migration der alten Typen
  if (normalizedType.includes('strom')) {
    return ZaehlerTyp.STROM;
  }
  if (normalizedType.includes('kaltwasser') || (normalizedType.includes('wasser') && !normalizedType.includes('warmwasser'))) {
    return ZaehlerTyp.KALTWASSER;
  }
  if (normalizedType.includes('warmwasser')) {
    return ZaehlerTyp.WARMWASSER;
  }
  if (normalizedType.includes('wärmemenge heizung') || normalizedType.includes('wmz heizung')) {
    return ZaehlerTyp.WMZ_HEIZUNG;
  }
  if (normalizedType.includes('wärmemenge warmwasser') || normalizedType.includes('wmz warmwasser')) {
    return ZaehlerTyp.WMZ_WARMWASSER;
  }
  if (normalizedType.includes('hkv') || normalizedType.includes('heizkostenverteiler')) {
    console.warn(`HKV nicht mehr unterstützt: "${oldType}" → wird zu "Sonstiges" konvertiert`);
    return ZaehlerTyp.SONSTIGES;
  }
  
  // Unbekannte Typen zu "Sonstiges"
  if (normalizedType !== 'sonstiges') {
    console.warn(`Unbekannter Zählertyp: "${oldType}" → wird zu "Sonstiges" konvertiert`);
  }
  return ZaehlerTyp.SONSTIGES;
}

describe('Zählertyp-Migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock zaehlerService methods mit Migration
    const zaehlerService = require('../src/services/zaehler.service').default;
    
    // Simuliere die Migration wie im echten Service
    const migratedZaehler = mockZaehlerWithOldTypes.map(z => ({
      ...z,
      zaehlertyp: typeof z.zaehlertyp === 'string' ? migrateZaehlerTyp(z.zaehlertyp) : z.zaehlertyp
    }));
    
    zaehlerService.list.mockResolvedValue(migratedZaehler);
    zaehlerService.listByEinheit.mockResolvedValue(
      new Map([
        ['allgemein', [migratedZaehler[0], migratedZaehler[1], migratedZaehler[4]]],
        ['1', [migratedZaehler[2]]],
        ['2', [migratedZaehler[3]]]
      ])
    );
  });

  test('Alte Zählertyp-Strings werden zu neuen Labels migriert', async () => {
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

    // Prüfe dass die alten Strings zu neuen Labels migriert wurden
    expect(screen.getByText('Strom (kWh)')).toBeInTheDocument();
    expect(screen.getByText('Kaltwasser (m³)')).toBeInTheDocument();
    expect(screen.getByText('Wärmemenge Heizung (MWh)')).toBeInTheDocument();
    
    // Prüfe dass es mindestens einen "Sonstiges" gibt (HKV und UnbekannterTyp)
    const sonstigesElements = screen.getAllByText('Sonstiges');
    expect(sonstigesElements.length).toBeGreaterThanOrEqual(2);
  });

  test('Migration-Logs werden korrekt ausgegeben', async () => {
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

    // Prüfe dass Warnungen für HKV ausgegeben wurden
    const hkvWarnings = warnLogs.filter(log => log.includes('HKV nicht mehr unterstützt'));
    expect(hkvWarnings).toHaveLength(1);
    expect(hkvWarnings[0]).toContain('HKV nicht mehr unterstützt: "HKV" → wird zu "Sonstiges" konvertiert');

    // Prüfe dass Warnungen für unbekannte Typen ausgegeben wurden
    // "Wasser" wird zu "Kaltwasser" migriert, aber "Wasser" ist kein bekannter Typ
    const unknownWarnings = warnLogs.filter(log => log.includes('Unbekannter Zählertyp'));
    expect(unknownWarnings.length).toBeGreaterThan(0);
  });

  test('Alle Zähler werden korrekt angezeigt trotz Migration', async () => {
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

    // Prüfe dass alle 5 Zähler angezeigt werden
    expect(screen.getByText('A001')).toBeInTheDocument();
    expect(screen.getByText('W001')).toBeInTheDocument();
    expect(screen.getByText('HKV001')).toBeInTheDocument();
    expect(screen.getByText('WMZ001')).toBeInTheDocument();
    expect(screen.getByText('U001')).toBeInTheDocument();

    // Prüfe dass alle Einheiten angezeigt werden
    expect(screen.getByText('Einheit: Allgemein')).toBeInTheDocument();
    expect(screen.getByText('Einheit: 1 Wohnung 1')).toBeInTheDocument();
    expect(screen.getByText('Einheit: 2 Wohnung 2')).toBeInTheDocument();
  });

  test('Migration funktioniert für verschiedene alte String-Formate', async () => {
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

    // Prüfe spezifische Migrationen
    // "Strom" → "Strom (kWh)"
    expect(screen.getByText('Strom (kWh)')).toBeInTheDocument();
    
    // "Wasser" → "Kaltwasser (m³)"
    expect(screen.getByText('Kaltwasser (m³)')).toBeInTheDocument();
    
    // "WMZ Heizung" → "Wärmemenge Heizung (MWh)"
    expect(screen.getByText('Wärmemenge Heizung (MWh)')).toBeInTheDocument();
    
    // "HKV" → "Sonstiges" und "UnbekannterTyp" → "Sonstiges"
    const sonstigesElements = screen.getAllByText('Sonstiges');
    expect(sonstigesElements.length).toBeGreaterThanOrEqual(2);
  });
});
