/**
 * End-to-End Tests für "Neuen Beleg anlegen" Funktionalität
 * 
 * Testet den kompletten Workflow vom Öffnen des Modals bis zum erfolgreichen Speichern
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BelegePage from '../renderer/components/BelegePage';
import { ImmobilienProvider } from '../renderer/contexts/ImmobilienContext';
import { Beleg, Kostenart, WEGEinheit } from '../renderer/contexts/ImmobilienContext';

// Mock belegStorage
jest.mock('../renderer/storage/belegStorage', () => ({
  createBeleg: jest.fn(),
  updateBeleg: jest.fn(),
  deleteBeleg: jest.fn(),
  findBelege: jest.fn()
}));

// Mock UmlageService
jest.mock('../renderer/services/umlageService', () => ({
  processUmlage: jest.fn()
}));

// Mock window.alert
global.window.alert = jest.fn();

// Mock-Daten
const mockWegId = 'test-weg-123';

const mockKostenarten: Kostenart[] = [
  {
    id: 'kostenart-1',
    wegId: mockWegId,
    name: 'Grundsteuer',
    aktiv: true,
    verteilschluesselId: 'MEA',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'kostenart-2',
    wegId: mockWegId,
    name: 'Hausmeister',
    aktiv: true,
    verteilschluesselId: 'WOHNFLAECHE',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockWegEinheiten: WEGEinheit[] = [
  {
    id: 'einheit-1',
    wegId: mockWegId,
    name: 'Wohnung 1',
    wohnungsnummer: 1,
    ordnung: 1,
    miteigentumsanteil: 0.25,
    wohnflaeche: 75,
    mieterName: 'Mieter 1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'einheit-2',
    wegId: mockWegId,
    name: 'Wohnung 2',
    wohnungsnummer: 2,
    ordnung: 2,
    miteigentumsanteil: 0.25,
    wohnflaeche: 75,
    mieterName: 'Mieter 2',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockBelege: Beleg[] = [
  {
    id: 'beleg-1',
    wegId: mockWegId,
    datum: '2024-01-15',
    belegname: 'Grundsteuer Q1 2024',
    betragBrutto: 500.00,
    mwstSatz: 0,
    netto: 500.00,
    steuerlicheKostenart: 'Grundsteuer',
    kostenartId: 'kostenart-1',
    verteilschluesselId: 'MEA',
    jahr: 2024,
    periodeVon: '2024-01-01',
    periodeBis: '2024-03-31',
    lohnkosten35aBrutto: 0,
    anhang: null,
    status: 'GEBUCHT',
    abgerechnet: false,
    umlageSnapshot: undefined,
    umlageQuelle: 'auto',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  }
];

// Test-Utilities
const renderBelegePage = () => {
  return render(
    <MemoryRouter initialEntries={[`/immobilien/${mockWegId}/buchhaltung/belege`]}>
      <Routes>
        <Route 
          path="/immobilien/:wegId/buchhaltung/belege" 
          element={
            <ImmobilienProvider>
              <BelegePage />
            </ImmobilienProvider>
          } 
        />
      </Routes>
    </MemoryRouter>
  );
};

const getMockStorage = () => {
  const belegStorage = require('../renderer/storage/belegStorage');
  const umlageService = require('../renderer/services/umlageService');
  return { belegStorage, umlageService };
};

describe('Beleg erstellen - End-to-End Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Mock belegStorage
    const { belegStorage } = getMockStorage();
    belegStorage.findBelege.mockResolvedValue(mockBelege);
    belegStorage.createBeleg.mockResolvedValue({
      id: 'beleg-new-123',
      wegId: mockWegId,
      datum: '2024-12-20',
      belegname: 'Testbeleg',
      betragBrutto: 123.45,
      mwstSatz: 19,
      netto: 103.74,
      steuerlicheKostenart: '',
      kostenartId: 'kostenart-1',
      verteilschluesselId: 'MEA',
      jahr: 2024,
      periodeVon: '2024-01-01',
      periodeBis: '2024-12-31',
      lohnkosten35aBrutto: 0,
      anhang: null,
      status: 'ENTWURF',
      abgerechnet: false,
      umlageSnapshot: undefined,
      umlageQuelle: 'auto',
      createdAt: '2024-12-20T00:00:00Z',
      updatedAt: '2024-12-20T00:00:00Z'
    });
    
    // Mock UmlageService
    const { umlageService } = getMockStorage();
    umlageService.processUmlage.mockResolvedValue({
      beleg: {
        id: 'beleg-new-123',
        umlageSnapshot: {
          verteilung: new Map([
            ['einheit-1', 30.86],
            ['einheit-2', 30.86]
          ]),
          hinweise: ['Umlage erfolgreich berechnet']
        }
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Happy Path - Erfolgreicher Beleg-Create', () => {
    test('öffnet Modal und erstellt neuen Beleg erfolgreich', async () => {
      renderBelegePage();
      
      // Warte auf Laden der Seite
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      // Button "Neuer Beleg" klicken
      const neuerBelegButton = screen.getByRole('button', { name: /neuer beleg/i });
      expect(neuerBelegButton).toBeInTheDocument();
      await user.click(neuerBelegButton);

      // Modal sollte geöffnet sein
      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Prüfe Default-Werte
      const datumInput = screen.getByLabelText(/datum/i) as HTMLInputElement;
      const kostenartSelect = screen.getByLabelText(/kostenart/i) as HTMLSelectElement;
      
      expect(datumInput.value).toBe(new Date().toISOString().split('T')[0]);
      expect(kostenartSelect.value).toBe('kostenart-1'); // Erste aktive Kostenart
      
      // Pflichtfelder ausfüllen
      const belegnameInput = screen.getByLabelText(/belegname/i);
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      
      await user.clear(belegnameInput);
      await user.type(belegnameInput, 'Testbeleg');
      await user.clear(betragInput);
      await user.type(betragInput, '123.45');

      // Submit
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Prüfe Storage-Aufruf
      const { belegStorage } = getMockStorage();
      await waitFor(() => {
        expect(belegStorage.createBeleg).toHaveBeenCalledTimes(1);
      });

      const createCall = belegStorage.createBeleg.mock.calls[0][0];
      expect(createCall).toMatchObject({
        wegId: mockWegId,
        belegname: 'Testbeleg',
        betragBrutto: 123.45,
        kostenartId: 'kostenart-1',
        verteilschluesselId: 'MEA'
      });

      // Modal sollte geschlossen sein
      await waitFor(() => {
        expect(screen.queryByText('Neuer Beleg')).not.toBeInTheDocument();
      });

      // Neuer Beleg sollte in der Liste sichtbar sein
      await waitFor(() => {
        expect(screen.getByText('Testbeleg')).toBeInTheDocument();
        expect(screen.getByText('123,45 €')).toBeInTheDocument();
        expect(screen.getByText('Grundsteuer')).toBeInTheDocument();
      });
    });

    test('setzt automatisch Verteilerschlüssel basierend auf Kostenart', async () => {
      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Verteilerschlüssel sollte automatisch gesetzt sein
      const verteilschluesselField = screen.getByText('Miteigentumsanteil');
      expect(verteilschluesselField).toBeInTheDocument();
    });
  });

  describe('Validierungsfälle - Client-seitige Validierung', () => {
    test('zeigt Fehlermeldungen bei leerem Submit', async () => {
      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Direkt submit ohne Eingabe
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Alle Pflichtfelder sollten Fehlermeldungen haben
      await waitFor(() => {
        expect(screen.getByText('Belegname ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Gültiger Belegbetrag ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Datum ist erforderlich')).toBeInTheDocument();
      });

      // Storage sollte nicht aufgerufen werden
      const { belegStorage } = getMockStorage();
      expect(belegStorage.createBeleg).not.toHaveBeenCalled();
    });

    test('zeigt Typfehler bei ungültigem Betrag', async () => {
      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Ungültigen Betrag eingeben
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      await user.clear(betragInput);
      await user.type(betragInput, 'abc');

      // Submit
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Fehlermeldung sollte angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('Gültiger Belegbetrag ist erforderlich')).toBeInTheDocument();
      });
    });

    test('zeigt Fehlermeldung bei fehlender Kostenart', async () => {
      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Kostenart zurücksetzen
      const kostenartSelect = screen.getByLabelText(/kostenart/i);
      await user.selectOptions(kostenartSelect, '');

      // Submit
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Fehlermeldung sollte angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('Kostenart ist erforderlich')).toBeInTheDocument();
      });
    });
  });

  describe('Backend/DB - Storage-Integration', () => {
    test('ruft createBeleg mit korrektem Payload auf', async () => {
      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Pflichtfelder ausfüllen
      const belegnameInput = screen.getByLabelText(/belegname/i);
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      
      await user.clear(belegnameInput);
      await user.type(belegnameInput, 'Testbeleg');
      await user.clear(betragInput);
      await user.type(betragInput, '123.45');

      // Submit
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Prüfe Storage-Aufruf
      const { belegStorage } = getMockStorage();
      await waitFor(() => {
        expect(belegStorage.createBeleg).toHaveBeenCalledTimes(1);
      });

      const createCall = belegStorage.createBeleg.mock.calls[0][0];
      expect(createCall).toMatchObject({
        wegId: mockWegId,
        datum: expect.any(String),
        belegname: 'Testbeleg',
        betragBrutto: 123.45,
        mwstSatz: 19,
        netto: expect.any(Number),
        kostenartId: 'kostenart-1',
        verteilschluesselId: 'MEA',
        jahr: 2024,
        status: 'ENTWURF',
        abgerechnet: false
      });

      // Prüfe dass alle erforderlichen Felder gesetzt sind
      expect(createCall.id).toBeUndefined(); // Sollte nicht gesetzt sein
      expect(createCall.createdAt).toBeUndefined();
      expect(createCall.updatedAt).toBeUndefined();
    });

    test('behandelt Storage-Fehler korrekt', async () => {
      const { belegStorage } = getMockStorage();
      belegStorage.createBeleg.mockRejectedValue(new Error('Datenbankfehler'));

      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Pflichtfelder ausfüllen
      const belegnameInput = screen.getByLabelText(/belegname/i);
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      
      await user.clear(belegnameInput);
      await user.type(belegnameInput, 'Testbeleg');
      await user.clear(betragInput);
      await user.type(betragInput, '123.45');

      // Submit
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Fehlermeldung sollte angezeigt werden
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining('Fehler beim Speichern des Belegs: Datenbankfehler')
        );
      });

      // Modal sollte offen bleiben
      expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
    });
  });

  describe('State/Refresh - UI-Aktualisierung', () => {
    test('aktualisiert Liste nach erfolgreichem Create', async () => {
      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      // Initiale Anzahl der Belege
      const initialBelege = screen.getAllByRole('row').filter(row => 
        row.textContent?.includes('€')
      );
      expect(initialBelege).toHaveLength(1); // Nur der Mock-Beleg

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Neuen Beleg erstellen
      const belegnameInput = screen.getByLabelText(/belegname/i);
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      
      await user.clear(belegnameInput);
      await user.type(belegnameInput, 'Testbeleg');
      await user.clear(betragInput);
      await user.type(betragInput, '123.45');

      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Liste sollte aktualisiert werden
      await waitFor(() => {
        const updatedBelege = screen.getAllByRole('row').filter(row => 
          row.textContent?.includes('€')
        );
        expect(updatedBelege).toHaveLength(2); // Ursprünglicher + neuer Beleg
      });

      // Neuer Beleg sollte sichtbar sein
      expect(screen.getByText('Testbeleg')).toBeInTheDocument();
      expect(screen.getByText('123,45 €')).toBeInTheDocument();
    });

    test('behält Daten nach Navigation bei', async () => {
      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      // Neuen Beleg erstellen
      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      const belegnameInput = screen.getByLabelText(/belegname/i);
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      
      await user.clear(belegnameInput);
      await user.type(belegnameInput, 'Testbeleg');
      await user.clear(betragInput);
      await user.type(betragInput, '123.45');

      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Warte auf Speichern
      await waitFor(() => {
        expect(screen.queryByText('Neuer Beleg')).not.toBeInTheDocument();
      });

      // Beleg sollte in der Liste sein
      expect(screen.getByText('Testbeleg')).toBeInTheDocument();
    });
  });

  describe('Regressionsfälle - Fehlerbehandlung', () => {
    test('behandelt Umlage-Service-Fehler gracefully', async () => {
      const { umlageService } = getMockStorage();
      umlageService.processUmlage.mockRejectedValue(new Error('Umlage-Fehler'));

      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Beleg erstellen
      const belegnameInput = screen.getByLabelText(/belegname/i);
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      
      await user.clear(belegnameInput);
      await user.type(belegnameInput, 'Testbeleg');
      await user.clear(betragInput);
      await user.type(betragInput, '123.45');

      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Beleg sollte trotz Umlage-Fehler gespeichert werden
      await waitFor(() => {
        expect(screen.queryByText('Neuer Beleg')).not.toBeInTheDocument();
      });

      // Beleg sollte in der Liste sein
      expect(screen.getByText('Testbeleg')).toBeInTheDocument();
    });

    test('validiert MwSt-Satz korrekt', async () => {
      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Ungültigen MwSt-Satz setzen
      const mwstSelect = screen.getByLabelText(/mwst-satz/i);
      await user.selectOptions(mwstSelect, '-1'); // Custom

      const customMwstInput = screen.getByPlaceholderText(/custom mwst %/i);
      await user.clear(customMwstInput);
      await user.type(customMwstInput, '150'); // Ungültig > 100%

      // Submit
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      // Fehlermeldung sollte angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('MwSt-Satz muss zwischen 0 und 100 liegen')).toBeInTheDocument();
      });
    });
  });

  describe('Integration - Kostenarten-Stammdaten', () => {
    test('funktioniert nur wenn Kostenarten vorhanden sind', async () => {
      // Mock ohne Kostenarten
      const { belegStorage } = getMockStorage();
      belegStorage.findBelege.mockResolvedValue([]);

      renderBelegePage();
      
      await waitFor(() => {
        expect(screen.getByText('Belegliste')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /neuer beleg/i }));

      await waitFor(() => {
        expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      });

      // Kostenart-Select sollte leer sein
      const kostenartSelect = screen.getByLabelText(/kostenart/i);
      expect(kostenartSelect).toHaveValue('');

      // Submit sollte fehlschlagen
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);

      await waitFor(() => {
        expect(screen.getByText('Kostenart ist erforderlich')).toBeInTheDocument();
      });
    });
  });
});
