/**
 * RTL-Tests für Zählerübersicht Notizen
 * 
 * Testet die Notiz-Speicherung und Konsistenz zwischen Seiten
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ZaehlerUebersichtPage from '../renderer/components/ZaehlerUebersichtPage';
import { ImmobilienProvider } from '../renderer/contexts/ImmobilienContext';
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

// Mock window.confirm und window.alert
global.window.confirm = jest.fn(() => true);
global.window.alert = jest.fn();

// Mock-Daten
const mockEinheiten = [
  { id: 'allgemein', name: 'Allgemein', mieterName: 'Gemeinschaft' },
  { id: '1', name: '1 Wohnung 1', mieterName: 'Mieter 1', ordnung: 1, wohnungsnummer: 1 },
  { id: '2', name: '2 Wohnung 2', mieterName: 'Mieter 2', ordnung: 2, wohnungsnummer: 2 },
  { id: '3', name: '3 Wohnung 3', mieterName: 'Eigentümer', ordnung: 3, wohnungsnummer: 3 }
];

const mockZaehler = [
  {
    id: 'zaehler-1',
    einheitId: 'allgemein',
    zaehlernummer: 'A001',
    bezeichnung: 'Hauptzähler für das gesamte Gebäude',
    zaehlertyp: ZaehlerTyp.STROM,
    standort: 'Keller',
    notiz: 'Hauptzähler für das gesamte Gebäude',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'zaehler-2',
    einheitId: '1',
    zaehlernummer: 'A002',
    bezeichnung: 'Wohnungszähler 1',
    zaehlertyp: ZaehlerTyp.STROM,
    standort: 'Wohnung 1',
    notiz: 'Zähler für Wohnung 1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

describe('ZaehlerUebersicht - Notizen & Konsistenz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock zaehlerService methods
    const zaehlerService = require('../src/services/zaehler.service').default;
    zaehlerService.list.mockResolvedValue(mockZaehler);
    zaehlerService.listByEinheit.mockResolvedValue(
      new Map([
        ['allgemein', [mockZaehler[0]]],
        ['1', [mockZaehler[1]]],
        ['2', []],
        ['3', []]
      ])
    );
    zaehlerService.updateNote.mockResolvedValue({
      ...mockZaehler[0],
      notiz: 'Test-Notiz 123'
    });
    
    // Stelle sicher, dass der Mock korrekt eingerichtet ist
    console.log('Mock setup:', {
      list: zaehlerService.list,
      listByEinheit: zaehlerService.listByEinheit,
      updateNote: zaehlerService.updateNote
    });
  });

  test('Notiz wird gespeichert und persistiert', async () => {
    const user = userEvent.setup();
    
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

    // Finde die erste Notiz-Textarea in "Allgemein" über data-testid
    const noteInput = screen.getByTestId('note-input-zaehler-1');
    expect(noteInput).toBeInTheDocument();

    // Lösche den bestehenden Text und tippe eine neue Notiz
    await user.click(noteInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(noteInput, 'Test-Notiz 123');

    // Löse Blur aus
    await user.tab();

    // Warte auf den Service-Aufruf
    await waitFor(() => {
      const zaehlerService = require('../src/services/zaehler.service').default;
      expect(zaehlerService.updateNote).toHaveBeenCalledWith('zaehler-1', 'Test-Notiz 123');
    });

    // Prüfe, dass der Text "Test-Notiz 123" ist
    expect(noteInput).toHaveValue('Test-Notiz 123');
  });

  test('Leere Einheit wird korrekt angezeigt', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/zaehler/uebersicht']}>
        <ImmobilienProvider>
          <Routes>
            <Route path="/immobilien/:wegId/zaehler/uebersicht" element={<ZaehlerUebersichtPage />} />
          </Routes>
        </ImmobilienProvider>
      </MemoryRouter>
    );

    // Warte auf das Laden der Daten - suche nach dem Text der in mehrere Elemente aufgeteilt ist
    await waitFor(() => {
      const einheitHeaders = screen.getAllByText(/Einheit:/);
      expect(einheitHeaders.length).toBeGreaterThan(0);
    });

    // Prüfe, dass die leere Einheit angezeigt wird
    const emptyMessages = screen.getAllByText('Keine Zähler vorhanden.');
    expect(emptyMessages.length).toBeGreaterThan(0);
    
    // Prüfe, dass der "Zähler anlegen" Button sichtbar ist
    const createButtons = screen.getAllByText('+ Zähler anlegen');
    expect(createButtons.length).toBeGreaterThan(0);
  });

  test('Notiz-Speicherung bei Netzwerkfehler - Revert zum letzten gültigen Wert', async () => {
    const user = userEvent.setup();
    
    // Mock zaehlerService.updateNote um einen Fehler zu werfen
    const zaehlerService = require('../src/services/zaehler.service').default;
    zaehlerService.updateNote.mockRejectedValue(new Error('Netzwerkfehler'));
    
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

    const noteInput = screen.getByTestId('note-input-zaehler-1');
    
    // Lösche den bestehenden Text und ändere die Notiz
    await user.click(noteInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(noteInput, 'Neue Notiz');

    // Löse Blur aus
    await user.tab();

    // Warte auf den fehlgeschlagenen Service-Aufruf
    await waitFor(() => {
      expect(zaehlerService.updateNote).toHaveBeenCalledWith('zaehler-1', 'Neue Notiz');
    });

    // Prüfe, dass der Text zum ursprünglichen Wert zurückgekehrt ist
    await waitFor(() => {
      expect(noteInput).toHaveValue('Hauptzähler für das gesamte Gebäude');
    });
  });
});

// Reporting nach Testlauf
describe('ZaehlerUebersicht - Reporting', () => {
  test('Reporting: Anzahl Einheiten, Zähler und gespeicherte Notizen', async () => {
    // Mock zaehlerService methods für diesen Test
    const zaehlerService = require('../src/services/zaehler.service').default;
    zaehlerService.list.mockResolvedValue(mockZaehler);
    
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

    // Logge die Ergebnisse
    console.log('=== ZAEHLERÜBERSICHT REPORTING ===');
    console.log(`Anzahl Einheiten: ${anzahlEinheiten}`);
    console.log(`Anzahl leere Einheiten: ${anzahlLeereEinheiten}`);
    console.log(`Anzahl "Zähler anlegen" Buttons: ${anzahlCreateButtons}`);
    
    // Bestätige die erwarteten Werte
    expect(anzahlEinheiten).toBe(5); // Allgemein + 4 Wohnungen
    expect(anzahlLeereEinheiten).toBeGreaterThan(0); // Mindestens eine Einheit ist leer
    expect(anzahlCreateButtons).toBe(5); // Jede Einheit hat einen Button
    
    console.log('=== ENDE REPORTING ===');
  });
});
