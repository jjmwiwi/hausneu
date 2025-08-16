import { Stammdaten } from '../contexts/ImmobilienContext';

const STAMMDATEN_STORAGE_KEY = 'hausverwaltung-stammdaten';

/**
 * Lädt gespeicherte Stammdaten aus dem localStorage
 */
export function loadStammdaten(): Stammdaten | null {
  try {
    const stored = localStorage.getItem(STAMMDATEN_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    
    const parsed = JSON.parse(stored);
    
    // Validiere die geladenen Daten
    if (isValidStammdaten(parsed)) {
      return parsed;
    } else {
      console.warn('Ungültige Stammdaten im Storage gefunden, verwende null');
      return null;
    }
  } catch (error) {
    console.error('Fehler beim Laden der Stammdaten:', error);
    return null;
  }
}

/**
 * Speichert Stammdaten im localStorage
 */
export function saveStammdaten(stammdaten: Stammdaten): void {
  try {
    localStorage.setItem(STAMMDATEN_STORAGE_KEY, JSON.stringify(stammdaten));
    console.log('Stammdaten erfolgreich gespeichert');
  } catch (error) {
    console.error('Fehler beim Speichern der Stammdaten:', error);
  }
}

/**
 * Prüft ob gespeicherte Stammdaten existieren
 */
export function hasStoredStammdaten(): boolean {
  try {
    const stored = localStorage.getItem(STAMMDATEN_STORAGE_KEY);
    return stored !== null;
  } catch (error) {
    console.error('Fehler beim Prüfen der gespeicherten Stammdaten:', error);
    return false;
  }
}

/**
 * Löscht gespeicherte Stammdaten
 */
export function clearStammdaten(): void {
  try {
    localStorage.removeItem(STAMMDATEN_STORAGE_KEY);
    console.log('Stammdaten erfolgreich gelöscht');
  } catch (error) {
    console.error('Fehler beim Löschen der Stammdaten:', error);
  }
}

/**
 * Validiert ob die geladenen Daten gültige Stammdaten sind
 */
function isValidStammdaten(data: any): data is Stammdaten {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    typeof data.address === 'string' &&
    typeof data.city === 'string' &&
    typeof data.zip === 'string' &&
    typeof data.notes === 'string' &&
    (data.image === undefined || typeof data.image === 'string') &&
    data.heizungsdaten &&
    typeof data.heizungsdaten === 'object' &&
    typeof data.heizungsdaten.heizungsart === 'string' &&
    typeof data.heizungsdaten.brennstoff === 'string' &&
    typeof data.heizungsdaten.beheizteWohnflaeche === 'number' &&
    typeof data.heizungsdaten.vorlauftemperatur === 'number' &&
    typeof data.heizungsdaten.einheitWarmwasser === 'string' &&
    typeof data.heizungsdaten.keinVerbrauch === 'boolean' &&
    typeof data.heizungsdaten.verbrauchsAnteil === 'number'
  );
}






