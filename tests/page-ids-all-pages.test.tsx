import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImmobilienProvider } from '../renderer/contexts/ImmobilienContext';
import WEGEinheitenPage from '../renderer/components/WEGEinheitenPage';
import KostenartenPage from '../renderer/components/KostenartenPage';
import StammdatenPage from '../renderer/components/StammdatenPage';
import { PAGE_IDS } from '../src/constants/pageIds';

// Mock für die Storage-Funktionen
jest.mock('../renderer/storage/wegEinheitenStorage', () => ({
  getWEGEinheiten: jest.fn(() => []),
  saveWEGEinheit: jest.fn(),
  deleteWEGEinheit: jest.fn(),
  updateWEGEinheit: jest.fn()
}));

// Mock für die DebugPageId
jest.mock('../renderer/components/ui/DebugPageId', () => {
  return function MockDebugPageId({ id }: { id: string }) {
    return <span data-testid="debug-page-id">{id}</span>;
  };
});

// Test-Wrapper mit ImmobilienProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ImmobilienProvider>
    {children}
  </ImmobilienProvider>
);

describe('Page-IDs auf allen Hauptseiten', () => {
  beforeEach(() => {
    // Mock window.__DEBUG_PAGE_IDS__ für sichtbare DebugPageId
    (global as any).window.__DEBUG_PAGE_IDS__ = true;
    (global as any).window.__VITE_MODE__ = 'development';
  });

  afterEach(() => {
    delete (global as any).window.__DEBUG_PAGE_IDS__;
    delete (global as any).window.__VITE_MODE__;
  });

  test('WEGEinheitenPage zeigt korrekte Page-ID an', () => {
    render(<WEGEinheitenPage />, { wrapper: TestWrapper });

    // H1 finden
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('WEG-Einheiten');

    // DebugPageId finden
    const debugPageId = screen.getByTestId('debug-page-id');
    expect(debugPageId).toBeInTheDocument();
    expect(debugPageId).toHaveTextContent(PAGE_IDS.WEG_EINHEITEN);
  });

  test('KostenartenPage zeigt korrekte Page-ID an', () => {
    render(<KostenartenPage />, { wrapper: TestWrapper });

    // H1 finden
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Kostenarten');

    // DebugPageId finden
    const debugPageId = screen.getByTestId('debug-page-id');
    expect(debugPageId).toBeInTheDocument();
    expect(debugPageId).toHaveTextContent(PAGE_IDS.KOSTENARTEN);
  });

  test('StammdatenPage zeigt korrekte Page-ID an', () => {
    render(<StammdatenPage />, { wrapper: TestWrapper });

    // H1 finden
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Stammdaten');

    // DebugPageId finden
    const debugPageId = screen.getByTestId('debug-page-id');
    expect(debugPageId).toBeInTheDocument();
    expect(debugPageId).toHaveTextContent(PAGE_IDS.WEG_STAMMDATEN);
  });

  test('Alle Page-IDs sind in PAGE_IDS definiert', () => {
    const expectedPageIds = [
      'weg-stammdaten',
      'weg-einheiten',
      'kostenarten',
      'zaehlerstand',
      'zaehler-uebersicht',
      'ablesungen',
      'ableseprotokoll',
      'betriebskostenabrechnung',
      'heizkosten',
      'vorauszahlungen'
    ];

    expectedPageIds.forEach(pageId => {
      expect(Object.values(PAGE_IDS)).toContain(pageId);
    });
  });

  test('Page-IDs sind sichtbar und nicht versteckt', () => {
    render(<KostenartenPage />, { wrapper: TestWrapper });

    // DebugPageId finden und prüfen, dass es sichtbar ist
    const debugPageId = screen.getByTestId('debug-page-id');
    expect(debugPageId).toBeVisible();
    expect(debugPageId).toHaveTextContent(PAGE_IDS.KOSTENARTEN);
  });

  test('PageTitle-Komponente wird korrekt verwendet', () => {
    render(<KostenartenPage />, { wrapper: TestWrapper });

    // H1 finden
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();

    // DebugPageId finden
    const debugPageId = screen.getByTestId('debug-page-id');
    expect(debugPageId).toBeInTheDocument();

    // Prüfen, dass beide im gleichen Header-Container sind
    const headerContainer = heading.closest('div');
    expect(headerContainer).toContainElement(debugPageId);
  });
});
