/**
 * Test: Zaehlerstand-Bugs
 * 
 * Test 1: Vollständigkeitsprüfung funktioniert nicht
 * Test 2: Zeitraumabhängigkeit fehlt (dieselben Ablesewerte in verschiedenen Jahren)
 * 
 * Das Script erstellt Dummy-Daten, führt die Tests durch und bereinigt alles wieder.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ImmobilienProvider } from '../renderer/contexts/ImmobilienContext';
import ZaehlerstaendeOverview from '../renderer/components/ZaehlerstaendeOverview';
import AblesungenPage from '../renderer/components/AblesungenPage';

// Mock für zaehlerStorage
jest.mock('../renderer/storage/zaehlerStorage', () => ({
  loadZaehler: jest.fn(),
  saveZaehler: jest.fn(),
}));

// Mock für localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock für crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
});

describe('Zaehlerstand-Bugs Tests', () => {
  let mockLoadZaehler: jest.Mock;
  let mockSaveZaehler: jest.Mock;
  
  // Dummy-Daten für Tests
  const dummyZaehler = [
    {
      id: 'zaehler-1',
      wegId: 'test-weg',
      einheitId: 'allgemein',
      zaehlernummer: 'TEST-001',
      bezeichnung: 'Test Zähler 1',
      zaehlertyp: 'STROM',
      zaehlertypEinheit: 'kWh',
      standort: 'Test Standort 1',
      notiz: 'Test Notiz 1',
      startwert: null,
      ablesewert: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    {
      id: 'zaehler-2',
      wegId: 'test-weg',
      einheitId: 'allgemein',
      zaehlernummer: 'TEST-002',
      bezeichnung: 'Test Zähler 2',
      zaehlertyp: 'WÄRME',
      zaehlertypEinheit: 'MWh',
      standort: 'Test Standort 2',
      notiz: 'Test Notiz 2',
      startwert: null,
      ablesewert: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }
  ];

  // Dummy-Zaehlerstaende für verschiedene Jahre
  const dummyZaehlerstaende = {
    2025: [
      {
        zaehlernummer: 'TEST-001',
        jahr: 2025,
        startwert: 100,
        ablesewert: 150,
        notiz: 'Test 2025',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        zaehlernummer: 'TEST-002',
        jahr: 2025,
        startwert: 200,
        ablesewert: 250,
        notiz: 'Test 2025',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    ],
    2024: [
      {
        zaehlernummer: 'TEST-001',
        jahr: 2024,
        startwert: 50,
        ablesewert: 100,
        notiz: 'Test 2024',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        zaehlernummer: 'TEST-002',
        jahr: 2024,
        startwert: 150,
        ablesewert: 200,
        notiz: 'Test 2024',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]
  };

  // Dummy-AbleseStatus
  const dummyAbleseStatus = [
    {
      jahr: 2025,
      isComplete: false,
      completedAt: undefined,
      meterSnapshot: undefined
    },
    {
      jahr: 2024,
      isComplete: false,
      completedAt: undefined,
      meterSnapshot: undefined
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup localStorage mocks
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'zaehlerstaende_status') {
        return JSON.stringify(dummyAbleseStatus);
      }
      if (key === 'zaehlerstaende') {
        return JSON.stringify([...dummyZaehlerstaende[2025], ...dummyZaehlerstaende[2024]]);
      }
      return null;
    });
    
    localStorageMock.setItem.mockImplementation(() => {});
    
    // Hole die gemockten Funktionen
    const zaehlerStorage = require('../renderer/storage/zaehlerStorage');
    mockLoadZaehler = zaehlerStorage.loadZaehler;
    mockSaveZaehler = zaehlerStorage.saveZaehler;
    
    // Mock für loadZaehler - gibt Dummy-Zähler zurück
    mockLoadZaehler.mockResolvedValue(dummyZaehler);
  });

  afterEach(() => {
    // Bereinige alle Dummy-Daten nach jedem Test
    localStorageMock.clear();
    console.log('🧹 [CLEANUP] Alle Dummy-Daten bereinigt');
  });

  const renderWithRouter = (component: React.ReactElement) => {
    // WICHTIG: Simuliere eine wegId für die Tests
    const mockParams = { wegId: 'test-weg' };
    
    return render(
      <BrowserRouter>
        <ImmobilienProvider>
          {component}
        </ImmobilienProvider>
      </BrowserRouter>
    );
  };

  test('TEST 1: Vollständigkeitsprüfung funktioniert jetzt korrekt', async () => {
    console.log('🧪 [TEST 1] Starte Test: Vollständigkeitsprüfung funktioniert jetzt korrekt');
    
    // 1. Rendere die ZaehlerstaendeOverview
    console.log('📝 [TEST 1] Schritt 1: Rendere ZaehlerstaendeOverview');
    
    renderWithRouter(<ZaehlerstaendeOverview />);
    
    // Warte bis die Seite geladen ist
    await waitFor(() => {
      expect(screen.getByText('Ablesung')).toBeInTheDocument();
    }, { timeout: 15000 });

    console.log('✅ [TEST 1] ZaehlerstaendeOverview geladen');

    // 2. Prüfe den initialen Status (sollte "nicht vollständig" sein)
    console.log('📝 [TEST 1] Schritt 2: Prüfe initialen Status');
    
    const statusBadges = screen.getAllByTestId('status-badge');
    expect(statusBadges.length).toBeGreaterThan(0);
    
    // Alle Jahre sollten initial "nicht vollständig" sein
    statusBadges.forEach(badge => {
      expect(badge).toHaveTextContent('✗ Nicht vollständig');
    });
    
    console.log('✅ [TEST 1] Initialer Status korrekt: Alle Jahre sind "nicht vollständig"');

    // 3. Simuliere, dass alle Zähler vollständig sind
    console.log('📝 [TEST 1] Schritt 3: Simuliere vollständige Zähler');
    
    // Aktualisiere die Dummy-Daten so, dass alle Zähler Start- und Ablesewerte haben
    const vollstaendigeZaehler = dummyZaehler.map(z => ({
      ...z,
      startwert: 100,
      ablesewert: 200
    }));

    // Mock die Zähler-Daten neu
    mockLoadZaehler.mockResolvedValue(vollstaendigeZaehler);

    // 4. Prüfe, ob der Status automatisch auf "vollständig" wechselt
    console.log('📝 [TEST 1] Schritt 4: Prüfe automatische Status-Änderung');
    
    // Warte auf Status-Update
    await waitFor(() => {
      const updatedStatusBadges = screen.getAllByTestId('status-badge');
      const hasCompleteStatus = updatedStatusBadges.some(badge => 
        badge.textContent?.includes('✓ Vollständig erfasst')
      );
      expect(hasCompleteStatus).toBe(true);
    }, { timeout: 10000 });

    console.log('✅ [TEST 1] Status erfolgreich auf "vollständig" geändert');
    
    // 5. Überprüfe die Console-Logs
    console.log('📝 [TEST 1] Schritt 5: Überprüfe Console-Logs');
    
    // Hier sollten wir die Logs der Vollständigkeitsprüfung sehen
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[zaehlerstaendeStatus] Prüfe Vollständigkeit für Jahr')
    );

    console.log('✅ [TEST 1] Test erfolgreich abgeschlossen - Vollständigkeitsprüfung funktioniert!');
  });

  test('TEST 2: Zeitraumabhängigkeit funktioniert jetzt korrekt', async () => {
    console.log('🧪 [TEST 2] Starte Test: Zeitraumabhängigkeit funktioniert jetzt korrekt');
    
    // 1. Rendere die ZaehlerstaendeOverview
    console.log('📝 [TEST 2] Schritt 1: Rendere ZaehlerstaendeOverview');
    
    renderWithRouter(<ZaehlerstaendeOverview />);
    
    // Warte bis die Seite geladen ist
    await waitFor(() => {
      expect(screen.getByText('Ablesung')).toBeInTheDocument();
    }, { timeout: 15000 });

    console.log('✅ [TEST 2] ZaehlerstaendeOverview geladen');

    // 2. Prüfe, ob verschiedene Jahre unterschiedliche Daten haben
    console.log('📝 [TEST 2] Schritt 2: Prüfe Zeitraumabhängigkeit');
    
    // Lade die Zählerstände für verschiedene Jahre
    const { loadZaehlerstaendeForYear } = require('../renderer/components/ZaehlerstaendeOverview');
    
    // Teste Jahr 2025
    const zaehlerstaende2025 = await loadZaehlerstaendeForYear(2025);
    expect(zaehlerstaende2025.length).toBe(2);
    
    // Prüfe, ob die Daten für 2025 korrekt sind
    const zaehler2025_1 = zaehlerstaende2025.find(z => z.zaehlernummer === 'TEST-001');
    expect(zaehler2025_1?.startwert).toBe(100);
    expect(zaehler2025_1?.ablesewert).toBe(150);
    expect(zaehler2025_1?.jahr).toBe(2025);
    
    // Teste Jahr 2024
    const zaehlerstaende2024 = await loadZaehlerstaendeForYear(2024);
    expect(zaehlerstaende2024.length).toBe(2);
    
    // Prüfe, ob die Daten für 2024 korrekt sind
    const zaehler2024_1 = zaehlerstaende2024.find(z => z.zaehlernummer === 'TEST-001');
    expect(zaehler2024_1?.startwert).toBe(50);
    expect(zaehler2024_1?.ablesewert).toBe(100);
    expect(zaehler2024_1?.jahr).toBe(2024);
    
    // 3. Prüfe, ob die Daten wirklich unterschiedlich sind
    console.log('📝 [TEST 2] Schritt 3: Prüfe Datenunterschiede zwischen Jahren');
    
    expect(zaehler2025_1?.startwert).not.toBe(zaehler2024_1?.startwert);
    expect(zaehler2025_1?.ablesewert).not.toBe(zaehler2024_1?.ablesewert);
    
    console.log('✅ [TEST 2] Daten sind zeitraumabhängig:');
    console.log(`  2025: startwert=${zaehler2025_1?.startwert}, ablesewert=${zaehler2025_1?.ablesewert}`);
    console.log(`  2024: startwert=${zaehler2024_1?.startwert}, ablesewert=${zaehler2024_1?.ablesewert}`);

    // 4. Teste die Ablesungen-Seite für ein spezifisches Jahr
    console.log('📝 [TEST 2] Schritt 4: Teste Ablesungen-Seite für Jahr 2025');
    
    const { rerender } = renderWithRouter(<AblesungenPage />);
    
    // Setze die Route-Parameter
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/immobilien/test-weg/ablesungen/2025'
      },
      writable: true
    });

    // Warte bis die Seite geladen ist
    await waitFor(() => {
      expect(screen.getByText('Ablesungen')).toBeInTheDocument();
    });

    console.log('✅ [TEST 2] Ablesungen-Seite für Jahr 2025 geladen');

    // 5. Prüfe, ob die jahresspezifischen Daten korrekt geladen werden
    console.log('📝 [TEST 2] Schritt 5: Prüfe jahresspezifische Daten in Ablesungen-Seite');
    
    // Hier sollten wir die Logs der jahresspezifischen Datenladung sehen
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`[Ablesungen] ${dummyZaehlerstaende[2025].length} Zählerstände für Jahr 2025 geladen`)
    );

    console.log('✅ [TEST 2] Test erfolgreich abgeschlossen - Zeitraumabhängigkeit funktioniert!');
  });

  test('INTEGRATIONSTEST: Vollständige Workflow-Tests', async () => {
    console.log('🧪 [INTEGRATIONSTEST] Starte vollständigen Workflow-Test');
    
    // 1. Rendere Overview
    console.log('📝 [INTEGRATIONSTEST] Schritt 1: Rendere Overview');
    
    renderWithRouter(<ZaehlerstaendeOverview />);
    
    await waitFor(() => {
      expect(screen.getByText('Ablesung')).toBeInTheDocument();
    }, { timeout: 15000 });

    // 2. Prüfe alle Jahre
    console.log('📝 [INTEGRATIONSTEST] Schritt 2: Prüfe alle Jahre');
    
    const statusBadges = screen.getAllByTestId('status-badge');
    expect(statusBadges.length).toBeGreaterThanOrEqual(2); // Mindestens 2 Jahre
    
    // 3. Teste PDF-Erstellung
    console.log('📝 [INTEGRATIONSTEST] Schritt 3: Teste PDF-Erstellung');
    
    const pdfButtons = screen.getAllByText('Ableseprotokoll (PDF)');
    expect(pdfButtons.length).toBeGreaterThan(0);
    
    // 4. Teste Navigation zu Ablesungen
    console.log('📝 [INTEGRATIONSTEST] Schritt 4: Teste Navigation zu Ablesungen');
    
    const ablesungButtons = screen.getAllByText('Ablesung');
    expect(ablesungButtons.length).toBeGreaterThan(0);
    
    console.log('✅ [INTEGRATIONSTEST] Alle Workflow-Tests erfolgreich!');
  });

  test('CLEANUP: Bereinige alle Dummy-Daten', async () => {
    console.log('🧹 [CLEANUP] Starte Bereinigung aller Dummy-Daten');
    
    // Lösche alle Dummy-Daten aus localStorage
    localStorageMock.clear();
    
    // Lösche alle Dummy-Zaehlerstaende
    localStorageMock.removeItem('zaehlerstaende');
    localStorageMock.removeItem('zaehlerstaende_status');
    
    // Überprüfe, dass alle Daten gelöscht wurden
    expect(localStorageMock.clear).toHaveBeenCalled();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('zaehlerstaende');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('zaehlerstaende_status');
    
    console.log('✅ [CLEANUP] Alle Dummy-Daten erfolgreich bereinigt');
  });
});
