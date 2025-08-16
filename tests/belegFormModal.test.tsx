/**
 * Unit-Tests für BelegFormModal-Komponente
 * 
 * Testet die Formular-Logik, Validierung und Default-Werte
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BelegFormModal from '../renderer/components/BelegFormModal';
import { Beleg, Kostenart, WEGEinheit } from '../renderer/contexts/ImmobilienContext';

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
  },
  {
    id: 'kostenart-3',
    wegId: mockWegId,
    name: 'Inaktive Kostenart',
    aktiv: false,
    verteilschluesselId: 'MEA',
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
  }
];

const mockBeleg: Beleg = {
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
};

// Test-Utilities
const renderBelegFormModal = (props: {
  isOpen: boolean;
  beleg?: Beleg | null;
  onSave?: jest.Mock;
  onClose?: jest.Mock;
}) => {
  const defaultProps = {
    isOpen: props.isOpen,
    onClose: props.onClose || jest.fn(),
    onSave: props.onSave || jest.fn(),
    beleg: props.beleg || null,
    kostenarten: mockKostenarten,
    wegEinheiten: mockWegEinheiten,
    selectedWegId: mockWegId
  };

  return render(<BelegFormModal {...defaultProps} />);
};

describe('BelegFormModal - Unit Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnSave: jest.Mock;
  let mockOnClose: jest.Mock;

  beforeEach(() => {
    user = userEvent.setup();
    mockOnSave = jest.fn();
    mockOnClose = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal-Öffnung und Schließung', () => {
    test('rendert nicht wenn isOpen=false', () => {
      renderBelegFormModal({ isOpen: false });
      
      expect(screen.queryByText('Neuer Beleg')).not.toBeInTheDocument();
      expect(screen.queryByText('Beleg bearbeiten')).not.toBeInTheDocument();
    });

    test('rendert "Neuer Beleg" wenn kein beleg übergeben wird', () => {
      renderBelegFormModal({ isOpen: true });
      
      expect(screen.getByText('Neuer Beleg')).toBeInTheDocument();
      expect(screen.queryByText('Beleg bearbeiten')).not.toBeInTheDocument();
    });

    test('rendert "Beleg bearbeiten" wenn beleg übergeben wird', () => {
      renderBelegFormModal({ isOpen: true, beleg: mockBeleg });
      
      expect(screen.getByText('Beleg bearbeiten')).toBeInTheDocument();
      expect(screen.queryByText('Neuer Beleg')).not.toBeInTheDocument();
    });

    test('schließt Modal bei Klick auf X-Button', async () => {
      renderBelegFormModal({ isOpen: true, onClose: mockOnClose });
      
      const closeButton = screen.getByRole('button', { name: '×' });
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('schließt Modal bei Klick auf Abbrechen-Button', async () => {
      renderBelegFormModal({ isOpen: true, onClose: mockOnClose });
      
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Default-Werte und Initialisierung', () => {
    test('setzt aktuelle Datum als Default', () => {
      renderBelegFormModal({ isOpen: true });
      
      const datumInput = screen.getByLabelText(/datum/i) as HTMLInputElement;
      const today = new Date().toISOString().split('T')[0];
      
      expect(datumInput.value).toBe(today);
    });

    test('setzt aktuelles Jahr als Default', () => {
      renderBelegFormModal({ isOpen: true });
      
      const jahrInput = screen.getByLabelText(/abrechnungsjahr/i) as HTMLInputElement;
      const currentYear = new Date().getFullYear();
      
      expect(jahrInput.value).toBe(currentYear.toString());
    });

    test('setzt erste aktive Kostenart als Default', () => {
      renderBelegFormModal({ isOpen: true });
      
      const kostenartSelect = screen.getByLabelText(/kostenart/i) as HTMLSelectElement;
      
      expect(kostenartSelect.value).toBe('kostenart-1'); // Grundsteuer (erste aktive)
    });

    test('setzt Verteilerschlüssel basierend auf Default-Kostenart', () => {
      renderBelegFormModal({ isOpen: true });
      
      // Verteilerschlüssel sollte automatisch gesetzt sein
      expect(screen.getByText('Miteigentumsanteil')).toBeInTheDocument();
    });

    test('setzt Standard-MwSt von 19%', () => {
      renderBelegFormModal({ isOpen: true });
      
      const mwstSelect = screen.getByLabelText(/mwst-satz/i) as HTMLSelectElement;
      
      expect(mwstSelect.value).toBe('19');
    });

    test('setzt Status auf ENTWURF', () => {
      renderBelegFormModal({ isOpen: true });
      
      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      
      expect(statusSelect.value).toBe('ENTWURF');
    });
  });

  describe('Formular-Validierung', () => {
    test('zeigt Fehlermeldung bei leerem Belegnamen', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
      // Direkt submit ohne Eingabe
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);
      
      await waitFor(() => {
        expect(screen.getByText('Belegname ist erforderlich')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('zeigt Fehlermeldung bei leerem Datum', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
      // Datum leeren
      const datumInput = screen.getByLabelText(/datum/i);
      await user.clear(datumInput);
      
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);
      
      await waitFor(() => {
        expect(screen.getByText('Datum ist erforderlich')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('zeigt Fehlermeldung bei ungültigem Betrag', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
      // Ungültigen Betrag setzen
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      await user.clear(betragInput);
      await user.type(betragInput, '0');
      
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);
      
      await waitFor(() => {
        expect(screen.getByText('Gültiger Belegbetrag ist erforderlich')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('zeigt Fehlermeldung bei fehlender Kostenart', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
      // Kostenart zurücksetzen
      const kostenartSelect = screen.getByLabelText(/kostenart/i);
      await user.selectOptions(kostenartSelect, '');
      
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);
      
      await waitFor(() => {
        expect(screen.getByText('Kostenart ist erforderlich')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('zeigt Fehlermeldung bei ungültigem Jahr', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
      // Ungültiges Jahr setzen
      const jahrInput = screen.getByLabelText(/abrechnungsjahr/i);
      await user.clear(jahrInput);
      await user.type(jahrInput, '1800'); // Zu alt
      
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);
      
      await waitFor(() => {
        expect(screen.getByText('Gültiges Abrechnungsjahr ist erforderlich')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('zeigt Fehlermeldung bei ungültigem MwSt-Satz', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
      // Custom MwSt mit ungültigem Wert
      const mwstSelect = screen.getByLabelText(/mwst-satz/i);
      await user.selectOptions(mwstSelect, '-1'); // Custom
      
      const customMwstInput = screen.getByPlaceholderText(/custom mwst %/i);
      await user.clear(customMwstInput);
      await user.type(customMwstInput, '150'); // > 100%
      
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);
      
      await waitFor(() => {
        expect(screen.getByText('MwSt-Satz muss zwischen 0 und 100 liegen')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('zeigt Fehlermeldung bei Lohnkosten > Bruttobetrag', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
      // Betrag setzen
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      await user.clear(betragInput);
      await user.type(betragInput, '100');
      
      // Lohnkosten > Betrag setzen
      const lohnkostenInput = screen.getByLabelText(/lohnkosten/i);
      await user.clear(lohnkostenInput);
      await user.type(lohnkostenInput, '150');
      
      const speichernButton = screen.getByRole('button', { name: /speichern/i });
      await user.click(speichernButton);
      
      await waitFor(() => {
        expect(screen.getByText('Lohnkosten dürfen nicht höher als der Bruttobetrag sein')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Formular-Submission', () => {
    test('ruft onSave mit korrekten Daten auf bei erfolgreicher Validierung', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
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
      
      // onSave sollte aufgerufen werden
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
      
      const savedData = mockOnSave.mock.calls[0][0];
      expect(savedData).toMatchObject({
        wegId: mockWegId,
        belegname: 'Testbeleg',
        betragBrutto: 123.45,
        kostenartId: 'kostenart-1',
        verteilschluesselId: 'MEA',
        jahr: new Date().getFullYear(),
        status: 'ENTWURF'
      });
    });

    test('berechnet Netto automatisch basierend auf Brutto und MwSt', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
      // Betrag und MwSt setzen
      const betragInput = screen.getByLabelText(/belegbetrag/i);
      await user.clear(betragInput);
      await user.type(betragInput, '100');
      
      const mwstSelect = screen.getByLabelText(/mwst-satz/i);
      await user.selectOptions(mwstSelect, '19');
      
      // Netto sollte automatisch berechnet werden
      const nettoInput = screen.getByLabelText(/netto/i) as HTMLInputElement;
      
      await waitFor(() => {
        expect(nettoInput.value).toBe('84,03 €'); // 100 / 1.19 ≈ 84.03
      });
    });

    test('setzt Zeitraum automatisch basierend auf Jahr', async () => {
      renderBelegFormModal({ isOpen: true, onSave: mockOnSave });
      
      // Jahr ändern
      const jahrInput = screen.getByLabelText(/abrechnungsjahr/i);
      await user.clear(jahrInput);
      await user.type(jahrInput, '2025');
      
      // Zeitraum sollte automatisch aktualisiert werden
      const zeitraumField = screen.getByText('2025-01-01 bis 2025-12-31');
      expect(zeitraumField).toBeInTheDocument();
    });
  });

  describe('Bearbeiten-Modus', () => {
    test('lädt bestehende Beleg-Daten korrekt', () => {
      renderBelegFormModal({ isOpen: true, beleg: mockBeleg });
      
      // Alle Felder sollten mit bestehenden Daten gefüllt sein
      const belegnameInput = screen.getByLabelText(/belegname/i) as HTMLInputElement;
      const betragInput = screen.getByLabelText(/belegbetrag/i) as HTMLInputElement;
      const kostenartSelect = screen.getByLabelText(/kostenart/i) as HTMLSelectElement;
      
      expect(belegnameInput.value).toBe('Grundsteuer Q1 2024');
      expect(betragInput.value).toBe('500');
      expect(kostenartSelect.value).toBe('kostenart-1');
    });

    test('zeigt Umlage-Status wenn vorhanden', () => {
      const belegMitUmlage = {
        ...mockBeleg,
        umlageSnapshot: {
          verteilung: new Map([['einheit-1', 125.00]]),
          hinweise: ['Umlage erfolgreich berechnet']
        }
      };
      
      renderBelegFormModal({ isOpen: true, beleg: belegMitUmlage });
      
      expect(screen.getByText('Umlage-Status')).toBeInTheDocument();
      expect(screen.getByText('Quelle: Automatisch')).toBeInTheDocument();
      expect(screen.getByText('Umlage erfolgreich berechnet')).toBeInTheDocument();
    });

    test('zeigt "Neu berechnen" Button wenn onRecalculateUmlage vorhanden', () => {
      const belegMitUmlage = {
        ...mockBeleg,
        umlageSnapshot: {
          verteilung: new Map([['einheit-1', 125.00]]),
          hinweise: []
        }
      };
      
      const mockOnRecalculate = jest.fn();
      
      render(
        <BelegFormModal
          isOpen={true}
          beleg={belegMitUmlage}
          onSave={mockOnSave}
          onClose={mockOnClose}
          onRecalculateUmlage={mockOnRecalculate}
          kostenarten={mockKostenarten}
          wegEinheiten={mockWegEinheiten}
          selectedWegId={mockWegId}
        />
      );
      
      expect(screen.getByRole('button', { name: /neu berechnen/i })).toBeInTheDocument();
    });
  });

  describe('Kostenarten-Filterung', () => {
    test('zeigt nur aktive Kostenarten im Dropdown', () => {
      renderBelegFormModal({ isOpen: true });
      
      const kostenartSelect = screen.getByLabelText(/kostenart/i);
      const options = Array.from(kostenartSelect.options);
      
      // Sollte 2 aktive Kostenarten haben + "Bitte wählen..."
      expect(options).toHaveLength(3);
      expect(options[1].text).toBe('Grundsteuer');
      expect(options[2].text).toBe('Hausmeister');
      
      // Inaktive Kostenart sollte nicht angezeigt werden
      const inaktiveOption = options.find(opt => opt.text === 'Inaktive Kostenart');
      expect(inaktiveOption).toBeUndefined();
    });

    test('sortiert Kostenarten alphabetisch', () => {
      renderBelegFormModal({ isOpen: true });
      
      const kostenartSelect = screen.getByLabelText(/kostenart/i);
      const options = Array.from(kostenartSelect.options);
      
      // "Bitte wählen..." ist erste Option
      expect(options[0].text).toBe('Bitte wählen...');
      // Dann alphabetisch: Grundsteuer, Hausmeister
      expect(options[1].text).toBe('Grundsteuer');
      expect(options[2].text).toBe('Hausmeister');
    });
  });

  describe('Verteilerschlüssel-Automatik', () => {
    test('aktualisiert Verteilerschlüssel wenn sich Kostenart ändert', async () => {
      renderBelegFormModal({ isOpen: true });
      
      // Erste Kostenart (MEA) ist bereits ausgewählt
      expect(screen.getByText('Miteigentumsanteil')).toBeInTheDocument();
      
      // Zu zweiter Kostenart wechseln (WOHNFLAECHE)
      const kostenartSelect = screen.getByLabelText(/kostenart/i);
      await user.selectOptions(kostenartSelect, 'kostenart-2');
      
      // Verteilerschlüssel sollte sich ändern
      await waitFor(() => {
        expect(screen.getByText('Wohnfläche')).toBeInTheDocument();
      });
    });
  });
});
