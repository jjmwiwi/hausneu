/**
 * RTL-Tests für Zählerübersicht CRUD-Operationen
 * 
 * Testet das Anlegen, Bearbeiten und Löschen von Zählern
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
  }
];

describe('ZaehlerUebersicht - CRUD-Operationen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock zaehlerService methods
    const zaehlerService = require('../src/services/zaehler.service').default;
    
    // Verwende separate Mock-Daten für jeden Test
    const testZaehler = [...mockZaehler];
    
    zaehlerService.list.mockResolvedValue(testZaehler);
    zaehlerService.listByEinheit.mockResolvedValue(
      new Map([
        ['allgemein', [testZaehler[0]]],
        ['1', [testZaehler[1]]],
        ['2', []],
        ['3', []]
      ])
    );
    
    // Mock für create mit detaillierter Rückgabe
    zaehlerService.create.mockResolvedValue({
      id: 'zaehler-new',
      wegId: 'test-weg',
      einheitId: '2',
      zaehlernummer: 'A003',
      bezeichnung: 'Neuer Zähler',
      zaehlertyp: 'STROM',
      zaehlertypEinheit: 'kWh',
      standort: 'Wohnung 2',
      notiz: 'Neuer Zähler für Wohnung 2',
      startwert: null,
      ablesewert: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    });
    
    // Mock für update mit detaillierter Rückgabe
    zaehlerService.update.mockResolvedValue({
      ...testZaehler[0],
      bezeichnung: 'Geänderte Bezeichnung',
      updatedAt: '2025-01-02T00:00:00Z'
    });
    
    // Mock für remove
    zaehlerService.remove.mockResolvedValue(undefined);
    
    // Mock für updateNote
    zaehlerService.updateNote.mockResolvedValue({
      ...testZaehler[0],
      notiz: 'Geänderte Notiz',
      updatedAt: '2025-01-02T00:00:00Z'
    });
    
    // Mock für findById
    zaehlerService.findById.mockImplementation((id) => {
      const found = testZaehler.find(z => z.id === id);
      return Promise.resolve(found || null);
    });
    
    // Mock für getZaehlerTypen
    zaehlerService.getZaehlerTypen.mockResolvedValue(Object.values(ZaehlerTyp));
    
    // Verhindere, dass resetMockData echte Daten löscht
    zaehlerService.resetMockData.mockImplementation(() => {
      console.log('[Test] resetMockData aufgerufen - Mock-Implementierung');
    });
  });

  test('Neuen Zähler anlegen', async () => {
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

    // Warte zusätzlich auf die Zähler
    await waitFor(() => {
      expect(screen.getByText('Hauptzähler für das gesamte Gebäude')).toBeInTheDocument();
    });

    // Klicke auf "Zähler anlegen" in der dritten Einheit (Wohnung 2)
    const createButtons = screen.getAllByText('+ Zähler anlegen');
    expect(createButtons).toHaveLength(5); // 5 Einheiten: Allgemein + 4 Wohnungen
    
    // Wähle den Button für Wohnung 2 (Index 2)
    await user.click(createButtons[2]);

    // Modal sollte geöffnet sein
    await waitFor(() => {
      expect(screen.getByText('Neuen Zähler anlegen')).toBeInTheDocument();
    });

    // Fülle die Pflichtfelder aus
    const zaehlernummerInput = screen.getByPlaceholderText('z.B. A001, W001');
    const bezeichnungInput = screen.getByPlaceholderText('z.B. Hauptzähler, Wohnungszähler');
    
    await user.click(zaehlernummerInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(zaehlernummerInput, 'A003');
    
    await user.click(bezeichnungInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(bezeichnungInput, 'Neuer Zähler');

    // Wähle einen anderen Zählertyp
    const zaehlertypSelect = screen.getByDisplayValue('Strom (kWh)');
    await user.selectOptions(zaehlertypSelect, 'KALTWASSER');

    // Fülle optionale Felder
    const standortInput = screen.getByPlaceholderText('z.B. Keller, Wohnung 1');
    await user.click(standortInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(standortInput, 'Wohnung 2');

    const notizInput = screen.getByPlaceholderText('Optionale Notiz zum Zähler...');
    await user.click(notizInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(notizInput, 'Neuer Kaltwasserzähler');

    // Submit
    const submitButton = screen.getByText('Anlegen');
    await user.click(submitButton);

    // Prüfe, dass create aufgerufen wurde
    await waitFor(() => {
      const zaehlerService = require('../src/services/zaehler.service').default;
      expect(zaehlerService.create).toHaveBeenCalledWith(
        'test-weg',
        expect.objectContaining({
          einheitId: expect.stringMatching(/^[1-4]$/), // Eine der Wohnungs-IDs
          zaehlernummer: 'A003',
          bezeichnung: 'Neuer Zähler',
          zaehlertyp: ZaehlerTyp.KALTWASSER,
          standort: 'Wohnung 2',
          notiz: 'Neuer Kaltwasserzähler'
        })
      );
    });
  });

  test('Zähler bearbeiten', async () => {
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

    // Warte zusätzlich auf die Zähler
    await waitFor(() => {
      expect(screen.getByText('Hauptzähler für das gesamte Gebäude')).toBeInTheDocument();
    });

    // Klicke auf "Bearbeiten" beim ersten Zähler (Pencil-Icon)
    const editButtons = screen.getAllByLabelText('Bearbeiten');
    expect(editButtons.length).toBeGreaterThan(0);
    await user.click(editButtons[0]);

    // Modal sollte geöffnet sein
    await waitFor(() => {
      expect(screen.getByText('Zähler bearbeiten')).toBeInTheDocument();
    });

    // Ändere die Bezeichnung - verwende den spezifischen Input im Modal
    const bezeichnungInputs = screen.getAllByDisplayValue('Hauptzähler für das gesamte Gebäude');
    const bezeichnungInputField = bezeichnungInputs.find(el => el.tagName === 'INPUT');
    expect(bezeichnungInputField).toBeInTheDocument();
    
    await user.click(bezeichnungInputField!);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(bezeichnungInputField!, 'Geänderte Bezeichnung');

    // Submit
    const submitButton = screen.getByText('Aktualisieren');
    await user.click(submitButton);

    // Prüfe, dass update aufgerufen wurde
    await waitFor(() => {
      const zaehlerService = require('../src/services/zaehler.service').default;
      expect(zaehlerService.update).toHaveBeenCalledWith(
        'test-weg',
        'zaehler-1',
        expect.objectContaining({
          bezeichnung: 'Geänderte Bezeichnung'
        })
      );
    });
  });

  test('Zähler löschen', async () => {
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

    // Warte zusätzlich auf die Zähler
    await waitFor(() => {
      expect(screen.getByText('Hauptzähler für das gesamte Gebäude')).toBeInTheDocument();
    });

    // Klicke auf "Löschen" beim ersten Zähler (Trash-Icon)
    const deleteButtons = screen.getAllByLabelText('Löschen');
    expect(deleteButtons.length).toBeGreaterThan(0);
    await user.click(deleteButtons[0]);

    // Bestätigungsdialog sollte angezeigt werden
    expect(window.confirm).toHaveBeenCalledWith(
      "Zähler 'Hauptzähler für das gesamte Gebäude' wirklich löschen? Dies kann nicht rückgängig gemacht werden."
    );

    // Prüfe, dass remove aufgerufen wurde
    await waitFor(() => {
      const zaehlerService = require('../src/services/zaehler.service').default;
      expect(zaehlerService.remove).toHaveBeenCalledWith(
        'test-weg',
        'zaehler-1'
      );
    });
  });

  test('Validierung der Pflichtfelder', async () => {
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

    // Warte zusätzlich auf die Zähler
    await waitFor(() => {
      expect(screen.getByText('Hauptzähler für das gesamte Gebäude')).toBeInTheDocument();
    });

    // Klicke auf "Zähler anlegen"
    const createButtons = screen.getAllByText('+ Zähler anlegen');
    await user.click(createButtons[0]);

    // Modal sollte geöffnet sein
    await waitFor(() => {
      expect(screen.getByText('Neuen Zähler anlegen')).toBeInTheDocument();
    });

    // Versuche zu submiten ohne Pflichtfelder
    const submitButton = screen.getByText('Anlegen');
    await user.click(submitButton);

    // Fehlermeldungen sollten angezeigt werden
    await waitFor(() => {
      expect(screen.getByText('Zählernummer ist erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Bezeichnung ist erforderlich')).toBeInTheDocument();
    });

    // Service sollte nicht aufgerufen werden
    const zaehlerService = require('../src/services/zaehler.service').default;
    expect(zaehlerService.create).not.toHaveBeenCalled();
  });
});
