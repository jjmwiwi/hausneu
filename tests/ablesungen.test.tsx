/**
 * Tests für die Ablesungen-Funktionalität
 * 
 * Testet alle Szenarien der neuen Ablesungen-Implementierung
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import AblesungenPage from '../renderer/components/AblesungenPage';
import { ZaehlerTyp } from '../src/types/zaehler.types';

// Mock ImmobilienContext
jest.mock('../renderer/contexts/ImmobilienContext', () => ({
  useImmobilien: () => ({
    wegEinheiten: [
      { id: '1', titel: 'Wohnung 1', wohnungsnummer: 1, mieter: 'Mieter 1' },
      { id: '2', titel: 'Wohnung 2', wohnungsnummer: 2, mieter: 'Mieter 2' }
    ],
    zaehler: [
      {
        id: 'zaehler-1',
        einheitId: 'allgemein',
        zaehlernummer: 'A001',
        bezeichnung: 'Hauptzähler',
        zaehlertyp: 'STROM',
        standort: 'Keller',
        notiz: 'Test Notiz',
        startwert: null,
        ablesewert: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'zaehler-2',
        einheitId: '1',
        zaehlernummer: 'W001',
        bezeichnung: 'Wohnungszähler 1',
        zaehlertyp: 'KALTWASSER',
        standort: 'Wohnung 1',
        notiz: 'Test Notiz 2',
        startwert: null,
        ablesewert: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    ],
    updateZaehler: jest.fn(),
    refreshZaehler: jest.fn()
  })
}));

// Mock Storage-Funktionen
jest.mock('../renderer/storage/zaehlerStorage', () => ({
  loadZaehler: jest.fn()
}));

jest.mock('../renderer/storage/zaehlerstaendeStorage', () => ({
  getZaehlerstand: jest.fn(),
  upsertZaehlerstand: jest.fn()
}));

jest.mock('../renderer/storage/zaehlerstaendeStatusStorage', () => ({
  getStatus: jest.fn(),
  setComplete: jest.fn(),
  isYearComplete: jest.fn()
}));

// Mock window.confirm und window.alert
global.window.confirm = jest.fn(() => true);
global.window.alert = jest.fn();

describe('Ablesungen-Funktionalität', () => {
  const mockUpdateZaehler = jest.fn();
  const mockRefreshZaehler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock-Funktionen direkt setzen
    mockUpdateZaehler.mockResolvedValue({});
    mockRefreshZaehler.mockResolvedValue({});
  });

  test('Happy Path – Startwert + Ablesewert eingeben → API-Call mit richtigen Werten', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/ablesungen/2025']}>
        <Routes>
          <Route path="/immobilien/:wegId/ablesungen/:jahr" element={<AblesungenPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Seite
    await waitFor(() => {
      expect(screen.getByText(/Debug Info|Keine Zähler|Einheit:/)).toBeInTheDocument();
    });

    // Finde Eingabefelder
    const startwertInput = screen.getByTestId('startwert-input-zaehler-1');
    const ablesewertInput = screen.getByTestId('ablesewert-input-zaehler-1');

    // Gebe Startwert ein
    fireEvent.change(startwertInput, { target: { value: '100' } });
    
    // Gebe Ablesewert ein
    fireEvent.change(ablesewertInput, { target: { value: '150' } });

    // Warte auf Debounce (500ms)
    await waitFor(() => {
      expect(mockUpdateZaehler).toHaveBeenCalledWith('test-weg', 'zaehler-1', {
        startwert: 100,
        ablesewert: 150
      });
    }, { timeout: 1000 });

    // Prüfe dass Context invalidiert wurde
    expect(mockRefreshZaehler).toHaveBeenCalledWith('test-weg');
  });

  test('Eingabefehler – Startwert > Ablesewert → kein API-Call, Toast mit "Eingabefehler"', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/ablesungen/2025']}>
        <Routes>
          <Route path="/immobilien/:wegId/ablesungen/:jahr" element={<AblesungenPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Seite
    await waitFor(() => {
      expect(screen.getByText(/Debug Info|Keine Zähler|Einheit:/)).toBeInTheDocument();
    });

    // Finde Eingabefelder
    const startwertInput = screen.getByTestId('startwert-input-zaehler-1');
    const ablesewertInput = screen.getByTestId('ablesewert-input-zaehler-1');

    // Gebe ungültige Werte ein (Startwert > Ablesewert)
    fireEvent.change(startwertInput, { target: { value: '200' } });
    fireEvent.change(ablesewertInput, { target: { value: '150' } });

    // Warte auf Validierung
    await waitFor(() => {
      expect(screen.getByText('Eingabefehler:')).toBeInTheDocument();
      expect(screen.getByText(/A001: Startwert muss kleiner oder gleich Ablesewert sein/)).toBeInTheDocument();
    });

    // Prüfe dass kein API-Call gemacht wurde
    expect(mockUpdateZaehler).not.toHaveBeenCalled();
  });

  test('Nur ein Wert – Nur Ablesewert setzen → API-Call mit Startwert=null', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/ablesungen/2025']}>
        <Routes>
          <Route path="/immobilien/:wegId/ablesungen/:jahr" element={<AblesungenPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Seite
    await waitFor(() => {
      expect(screen.getByText(/Debug Info|Keine Zähler|Einheit:/)).toBeInTheDocument();
    });

    // Finde nur Ablesewert-Eingabefeld
    const ablesewertInput = screen.getByTestId('ablesewert-input-zaehler-1');

    // Gebe nur Ablesewert ein
    fireEvent.change(ablesewertInput, { target: { value: '150' } });

    // Warte auf Debounce (500ms)
    await waitFor(() => {
      expect(mockUpdateZaehler).toHaveBeenCalledWith('test-weg', 'zaehler-1', {
        ablesewert: 150
      });
    }, { timeout: 1000 });

    // Prüfe dass Context invalidiert wurde
    expect(mockRefreshZaehler).toHaveBeenCalledWith('test-weg');
  });

  test('Debounce – Mehrfach tippen, nur ein Save-Call', async () => {
    jest.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/ablesungen/2025']}>
        <Routes>
          <Route path="/immobilien/:wegId/ablesungen/:jahr" element={<AblesungenPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Seite
    await waitFor(() => {
      expect(screen.getByText(/Debug Info|Keine Zähler|Einheit:/)).toBeInTheDocument();
    });

    // Finde Eingabefeld
    const startwertInput = screen.getByTestId('startwert-input-zaehler-1');

    // Gebe mehrfach Werte ein (innerhalb von 500ms)
    fireEvent.change(startwertInput, { target: { value: '100' } });
    fireEvent.change(startwertInput, { target: { value: '150' } });
    fireEvent.change(startwertInput, { target: { value: '200' } });

    // Prüfe dass noch kein API-Call gemacht wurde
    expect(mockUpdateZaehler).not.toHaveBeenCalled();

    // Warte auf Debounce
    jest.advanceTimersByTime(500);

    // Prüfe dass nur ein API-Call gemacht wurde (mit dem letzten Wert)
    await waitFor(() => {
      expect(mockUpdateZaehler).toHaveBeenCalledTimes(1);
      expect(mockUpdateZaehler).toHaveBeenCalledWith('test-weg', 'zaehler-1', {
        startwert: 200
      });
    });

    jest.useRealTimers();
  });

  test('de-DE Format – "1.234,56" wird korrekt als 1234.56 gespeichert', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/ablesungen/2025']}>
        <Routes>
          <Route path="/immobilien/:wegId/ablesungen/:jahr" element={<AblesungenPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Seite
    await waitFor(() => {
      expect(screen.getByText(/Debug Info|Keine Zähler|Einheit:/)).toBeInTheDocument();
    });

    // Finde Eingabefeld
    const startwertInput = screen.getByTestId('startwert-input-zaehler-1');

    // Gebe deutsche Zahl ein
    fireEvent.change(startwertInput, { target: { value: '1.234,56' } });

    // Warte auf Debounce (500ms)
    await waitFor(() => {
      expect(mockUpdateZaehler).toHaveBeenCalledWith('test-weg', 'zaehler-1', {
        startwert: 1234.56
      });
    }, { timeout: 1000 });
  });

  test('onBlur – Sofortiges Speichern bei Verlassen des Feldes', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/ablesungen/2025']}>
        <Routes>
          <Route path="/immobilien/:wegId/ablesungen/:jahr" element={<AblesungenPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Seite
    await waitFor(() => {
      expect(screen.getByText(/Debug Info|Keine Zähler|Einheit:/)).toBeInTheDocument();
    });

    // Finde Eingabefeld
    const startwertInput = screen.getByTestId('startwert-input-zaehler-1');

    // Gebe Wert ein
    fireEvent.change(startwertInput, { target: { value: '100' } });

    // Prüfe dass noch kein API-Call gemacht wurde
    expect(mockUpdateZaehler).not.toHaveBeenCalled();

    // Simuliere onBlur
    fireEvent.blur(startwertInput);

    // Prüfe dass sofort gespeichert wurde
    await waitFor(() => {
      expect(mockUpdateZaehler).toHaveBeenCalledWith('test-weg', 'zaehler-1', {
        startwert: 100
      });
    });
  });

  test('Leere Felder werden als null gespeichert', async () => {
    render(
      <MemoryRouter initialEntries={['/immobilien/test-weg/ablesungen/2025']}>
        <Routes>
          <Route path="/immobilien/:wegId/ablesungen/:jahr" element={<AblesungenPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Warte auf das Laden der Seite
    await waitFor(() => {
      expect(screen.getByText(/Debug Info|Keine Zähler|Einheit:/)).toBeInTheDocument();
    });

    // Finde Eingabefeld
    const startwertInput = screen.getByTestId('startwert-input-zaehler-1');

    // Gebe leeren Wert ein
    fireEvent.change(startwertInput, { target: { value: '' } });

    // Simuliere onBlur
    fireEvent.blur(startwertInput);

    // Prüfe dass null gespeichert wurde
    await waitFor(() => {
      expect(mockUpdateZaehler).toHaveBeenCalledWith('test-weg', 'zaehler-1', {
        startwert: null
      });
    });
  });
});
