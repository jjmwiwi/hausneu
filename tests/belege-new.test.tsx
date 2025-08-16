import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BelegeListe from '../src/renderer/belege/BelegeListe';

// Mock für window.api.invoke
const mockApiInvoke = jest.fn();

// Mock-Daten
const mockKostenarten = [
  { id: 1, name: 'Hausstrom' },
  { id: 2, name: 'Grundsteuer' },
  { id: 3, name: 'Versicherung' }
];

const mockBelege = [
  { id: 1, datum: '2024-01-15', betrag: 150.00, kostenartName: 'Hausstrom', verwendungszweck: 'Strom Januar' }
];

const mockNewBeleg = {
  id: 2,
  datum: '2024-01-20',
  betrag: 75.50,
  kostenartName: 'Grundsteuer',
  verwendungszweck: 'Grundsteuer Q1'
};

describe('BelegeListe - Neue Beleg-Erfassung', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // window.api global setzen
    Object.defineProperty(window, 'api', {
      value: {
        invoke: mockApiInvoke
      },
      writable: true
    });
  });

  describe('Test 1: Erfolgreiche Beleg-Erfassung', () => {
    it('sollte Modal öffnen, Felder ausfüllen, speichern und Modal schließen', async () => {
      // Mock für alle API-Aufrufe setzen
      mockApiInvoke
        .mockResolvedValueOnce(mockBelege)      // belege:list (initial)
        .mockResolvedValueOnce(mockKostenarten) // kostenarten:list (beim Modal-Öffnen)
        .mockResolvedValueOnce(mockNewBeleg);   // belege:create

      render(<BelegeListe />);

      // Warten bis die initialen Daten geladen sind und die Komponente gerendert ist
      await waitFor(() => {
        expect(screen.getByText('1 Belege geladen')).toBeInTheDocument();
      });

      // Klick auf "+ neuer Beleg" Button
      const newBelegButton = screen.getByTestId('btn-new-beleg');
      fireEvent.click(newBelegButton);

      // Modal sollte sichtbar sein
      await waitFor(() => {
        expect(screen.getByTestId('modal-beleg-erfassung')).toBeInTheDocument();
      });

      // Kostenarten sollten geladen werden
      expect(mockApiInvoke).toHaveBeenCalledWith('kostenarten:list');

      // Warten bis die Kostenarten im Select angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('Hausstrom')).toBeInTheDocument();
        expect(screen.getByText('Grundsteuer')).toBeInTheDocument();
      });

      // Felder ausfüllen
      const datumInput = screen.getByTestId('input-datum');
      const betragInput = screen.getByTestId('input-betrag');
      const kostenartSelect = screen.getByTestId('select-kostenart');
      const verwendungszweckInput = screen.getByTestId('input-verwendungszweck');

      fireEvent.change(datumInput, { target: { value: '2024-01-20' } });
      fireEvent.change(betragInput, { target: { value: '75.50' } });
      fireEvent.change(kostenartSelect, { target: { value: '2' } });
      fireEvent.change(verwendungszweckInput, { target: { value: 'Grundsteuer Q1' } });

      // Speichern-Button klicken
      const speichernButton = screen.getByTestId('btn-speichern');
      fireEvent.click(speichernButton);

      // belege:create sollte aufgerufen werden
      await waitFor(() => {
        expect(mockApiInvoke).toHaveBeenCalledWith('belege:create', {
          datum: '2024-01-20',
          betrag: 75.50,
          kostenartId: 2,
          verwendungszweck: 'Grundsteuer Q1',
          belegnummer: null,
          notizen: null
        });
      });

      // Modal sollte geschlossen werden
      await waitFor(() => {
        expect(screen.queryByTestId('modal-beleg-erfassung')).not.toBeInTheDocument();
      });

      // Liste sollte neu geladen werden
      expect(mockApiInvoke).toHaveBeenCalledWith('belege:list');
    });
  });

  describe('Test 2: Validierungsfehler bei leerem Formular', () => {
    it('sollte Validierungsfehler anzeigen wenn ohne Eingaben gespeichert wird', async () => {
      // Mock für API-Aufrufe setzen
      mockApiInvoke
        .mockResolvedValueOnce(mockBelege)      // belege:list (initial)
        .mockResolvedValueOnce(mockKostenarten); // kostenarten:list (beim Modal-Öffnen)

      render(<BelegeListe />);

      // Warten bis die initialen Daten geladen sind und die Komponente gerendert ist
      await waitFor(() => {
        expect(screen.getByText('1 Belege geladen')).toBeInTheDocument();
      });

      // Klick auf "+ neuer Beleg" Button
      const newBelegButton = screen.getByTestId('btn-new-beleg');
      fireEvent.click(newBelegButton);

      // Modal sollte sichtbar sein
      await waitFor(() => {
        expect(screen.getByTestId('modal-beleg-erfassung')).toBeInTheDocument();
      });

      // Kostenarten sollten geladen werden
      expect(mockApiInvoke).toHaveBeenCalledWith('kostenarten:list');

      // Warten bis die Kostenarten im Select angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('Hausstrom')).toBeInTheDocument();
      });

      // Direkt Speichern-Button klicken ohne Eingaben
      const speichernButton = screen.getByTestId('btn-speichern');
      fireEvent.click(speichernButton);

      // Validierungsfehler sollten angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('Datum ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Betrag muss größer als 0 sein')).toBeInTheDocument();
        expect(screen.getByText('Kostenart ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Verwendungszweck ist erforderlich')).toBeInTheDocument();
      });

      // belege:create sollte NICHT aufgerufen werden
      expect(mockApiInvoke).not.toHaveBeenCalledWith('belege:create', expect.anything());

      // Modal sollte noch sichtbar sein
      expect(screen.getByTestId('modal-beleg-erfassung')).toBeInTheDocument();
    });
  });

  describe('Zusätzliche Tests für Robustheit', () => {
    it('sollte Modal schließen wenn Abbrechen geklickt wird', async () => {
      // Mock für API-Aufrufe setzen
      mockApiInvoke
        .mockResolvedValueOnce(mockBelege)      // belege:list (initial)
        .mockResolvedValueOnce(mockKostenarten); // kostenarten:list (beim Modal-Öffnen)

      render(<BelegeListe />);

      // Warten bis die initialen Daten geladen sind und die Komponente gerendert ist
      await waitFor(() => {
        expect(screen.getByText('1 Belege geladen')).toBeInTheDocument();
      });

      // Klick auf "+ neuer Beleg" Button
      const newBelegButton = screen.getByTestId('btn-new-beleg');
      fireEvent.click(newBelegButton);

      // Modal sollte sichtbar sein
      await waitFor(() => {
        expect(screen.getByTestId('modal-beleg-erfassung')).toBeInTheDocument();
      });

      // Abbrechen-Button klicken
      const abbrechenButton = screen.getByTestId('btn-abbrechen');
      fireEvent.click(abbrechenButton);

      // Modal sollte geschlossen werden
      await waitFor(() => {
        expect(screen.queryByTestId('modal-beleg-erfassung')).not.toBeInTheDocument();
      });
    });

    it('sollte Modal schließen wenn außerhalb geklickt wird', async () => {
      // Mock für API-Aufrufe setzen
      mockApiInvoke
        .mockResolvedValueOnce(mockBelege)      // belege:list (initial)
        .mockResolvedValueOnce(mockKostenarten); // kostenarten:list (beim Modal-Öffnen)

      render(<BelegeListe />);

      // Warten bis die initialen Daten geladen sind und die Komponente gerendert ist
      await waitFor(() => {
        expect(screen.getByText('1 Belege geladen')).toBeInTheDocument();
      });

      // Klick auf "+ neuer Beleg" Button
      const newBelegButton = screen.getByTestId('btn-new-beleg');
      fireEvent.click(newBelegButton);

      // Modal sollte sichtbar sein
      await waitFor(() => {
        expect(screen.getByTestId('modal-beleg-erfassung')).toBeInTheDocument();
      });

      // Auf den Hintergrund klicken (Modal-Overlay)
      const modalOverlay = screen.getByTestId('modal-beleg-erfassung');
      fireEvent.click(modalOverlay);

      // Modal sollte geschlossen werden
      await waitFor(() => {
        expect(screen.queryByTestId('modal-beleg-erfassung')).not.toBeInTheDocument();
      });
    });

    it('sollte Fehlerbehandlung bei API-Fehlern zeigen', async () => {
      // Mock für API-Fehler setzen
      mockApiInvoke
        .mockResolvedValueOnce(mockBelege)      // belege:list (initial)
        .mockResolvedValueOnce(mockKostenarten) // kostenarten:list (beim Modal-Öffnen)
        .mockRejectedValueOnce(new Error('API Fehler')); // belege:create

      // alert mocken
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<BelegeListe />);

      // Warten bis die initialen Daten geladen sind und die Komponente gerendert ist
      await waitFor(() => {
        expect(screen.getByText('1 Belege geladen')).toBeInTheDocument();
      });

      // Klick auf "+ neuer Beleg" Button
      const newBelegButton = screen.getByTestId('btn-new-beleg');
      fireEvent.click(newBelegButton);

      // Modal sollte sichtbar sein
      await waitFor(() => {
        expect(screen.getByTestId('modal-beleg-erfassung')).toBeInTheDocument();
      });

      // Kostenarten sollten geladen werden
      expect(mockApiInvoke).toHaveBeenCalledWith('kostenarten:list');

      // Warten bis die Kostenarten im Select angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('Hausstrom')).toBeInTheDocument();
      });

      // Felder ausfüllen
      const datumInput = screen.getByTestId('input-datum');
      const betragInput = screen.getByTestId('input-betrag');
      const kostenartSelect = screen.getByTestId('select-kostenart');
      const verwendungszweckInput = screen.getByTestId('input-verwendungszweck');

      fireEvent.change(datumInput, { target: { value: '2024-01-20' } });
      fireEvent.change(betragInput, { target: { value: '75.50' } });
      fireEvent.change(kostenartSelect, { target: { value: '2' } });
      fireEvent.change(verwendungszweckInput, { target: { value: 'Grundsteuer Q1' } });

      // Speichern-Button klicken
      const speichernButton = screen.getByTestId('btn-speichern');
      fireEvent.click(speichernButton);

      // belege:create sollte aufgerufen werden
      await waitFor(() => {
        expect(mockApiInvoke).toHaveBeenCalledWith('belege:create', {
          datum: '2024-01-20',
          betrag: 75.50,
          kostenartId: 2,
          verwendungszweck: 'Grundsteuer Q1',
          belegnummer: null,
          notizen: null
        });
      });

      // Alert sollte angezeigt werden
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Fehler beim Speichern des Belegs');
      });

      // Modal sollte noch sichtbar sein
      expect(screen.getByTestId('modal-beleg-erfassung')).toBeInTheDocument();

      // Cleanup
      alertSpy.mockRestore();
    });
  });
});
