/**
 * Test für Debug-Page-ID-Anzeige
 * 
 * Testet dass alle Hauptseiten die rote Page-ID-Anzeige korrekt anzeigen
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import aller Hauptseiten
import StammdatenPage from '../renderer/components/StammdatenPage';
import WEGEinheitenPage from '../renderer/components/WEGEinheitenPage';
import KostenartenPage from '../renderer/components/KostenartenPage';
import ZaehlerstaendeOverview from '../renderer/components/ZaehlerstaendeOverview';
import AblesungenPage from '../renderer/components/AblesungenPage';
import ZaehlerUebersichtPage from '../renderer/components/ZaehlerUebersichtPage';

// Mock ImmobilienContext
jest.mock('../renderer/contexts/ImmobilienContext', () => ({
  useImmobilien: () => ({
    wegEinheiten: [
      { id: '1', titel: 'Wohnung 1', wohnungsnummer: 1, mieter: 'Mieter 1' }
    ],
    stammdaten: {
      name: 'Test WEG',
      address: 'Teststraße 1',
      city: 'Teststadt',
      zip: '12345',
      notes: '',
      image: '',
      heizungsdaten: {
        heizungsart: 'Zentral mit Warmwasser',
        brennstoff: 'Heizleistung (kWh)',
        beheizteWohnflaeche: 0,
        vorlauftemperatur: 60,
        einheitWarmwasser: 'Wärmemenge Warmwasser (MWh)',
        keinVerbrauch: false,
        verbrauchsAnteil: 70
      }
    },
    kostenarten: [],
    updateWEGEinheit: jest.fn(),
    updateKostenarten: jest.fn(),
    updateKostenart: jest.fn(),
    updateStammdaten: jest.fn(),
    repairWEGEinheitenData: jest.fn()
  })
}));

// Mock Storage-Funktionen
jest.mock('../renderer/storage/zaehlerStorage', () => ({
  loadZaehler: jest.fn(() => [])
}));

jest.mock('../renderer/storage/zaehlerstaendeStorage', () => ({
  getZaehlerstand: jest.fn(),
  upsertZaehlerstand: jest.fn(),
  ensurePeriod: jest.fn()
}));

jest.mock('../renderer/storage/zaehlerstaendeStatusStorage', () => ({
  getStatus: jest.fn(),
  setComplete: jest.fn(),
  isYearComplete: jest.fn(),
  loadAbleseStatus: jest.fn(() => [])
}));

// Mock zaehlerService
jest.mock('../src/services/zaehler.service', () => ({
  __esModule: true,
  default: {
    list: jest.fn(() => Promise.resolve([])),
    listByEinheit: jest.fn(() => Promise.resolve(new Map())),
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

// Mock process.env.NODE_ENV
const originalEnv = process.env.NODE_ENV;
beforeAll(() => {
  process.env.NODE_ENV = 'development';
});

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

describe('Debug-Page-ID-Anzeige', () => {
  test('StammdatenPage zeigt korrekte Page-ID an', () => {
    render(
      <MemoryRouter>
        <StammdatenPage />
      </MemoryRouter>
    );

    expect(screen.getByText('weg-stammdaten')).toBeInTheDocument();
    expect(screen.getByText('weg-stammdaten')).toHaveStyle({
      border: '1px solid red',
      color: 'red'
    });
  });

  test('WEGEinheitenPage zeigt korrekte Page-ID an', () => {
    render(
      <MemoryRouter>
        <WEGEinheitenPage />
      </MemoryRouter>
    );

    expect(screen.getByText('weg-einheiten')).toBeInTheDocument();
    expect(screen.getByText('weg-einheiten')).toHaveStyle({
      border: '1px solid red',
      color: 'red'
    });
  });

  test('KostenartenPage zeigt korrekte Page-ID an', () => {
    render(
      <MemoryRouter>
        <KostenartenPage />
      </MemoryRouter>
    );

    expect(screen.getByText('kostenarten')).toBeInTheDocument();
    expect(screen.getByText('kostenarten')).toHaveStyle({
      border: '1px solid red',
      color: 'red'
    });
  });

  test('ZaehlerstaendeOverview zeigt korrekte Page-ID an', () => {
    render(
      <MemoryRouter>
        <ZaehlerstaendeOverview />
      </MemoryRouter>
    );

    expect(screen.getByText('zaehlerstand')).toBeInTheDocument();
    expect(screen.getByText('zaehlerstand')).toHaveStyle({
      border: '1px solid red',
      color: 'red'
    });
  });

  test('AblesungenPage zeigt korrekte Page-ID an', () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/ablesungen/2025']}>
        <Routes>
          <Route path="/immobilien/:wegId/ablesungen/:jahr" element={<AblesungenPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('ablesungen')).toBeInTheDocument();
    expect(screen.getByText('ablesungen')).toHaveStyle({
      border: '1px solid red',
      color: 'red'
    });
  });

  test('ZaehlerUebersichtPage zeigt korrekte Page-ID an', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <Routes>
          <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte bis die Seite geladen ist (Loading verschwindet)
    await screen.findByText('Zählerübersicht');
    
    expect(screen.getByText('zaehler-uebersicht')).toBeInTheDocument();
    expect(screen.getByText('zaehler-uebersicht')).toHaveStyle({
      border: '1px solid red',
      color: 'red'
    });
  });

  test('DebugPageId wird in Production nicht angezeigt', () => {
    // Temporär auf Production setzen
    process.env.NODE_ENV = 'production';

    render(
      <MemoryRouter>
        <StammdatenPage />
      </MemoryRouter>
    );

    expect(screen.queryByText('weg-stammdaten')).not.toBeInTheDocument();

    // Zurück auf Development setzen
    process.env.NODE_ENV = 'development';
  });
});
