import { Kostenart } from '../contexts/ImmobilienContext';

const KOSTENARTEN_STORAGE_KEY = 'hausverwaltung-kostenarten';

/**
 * Lädt gespeicherte Kostenarten aus dem localStorage
 */
export function loadKostenarten(): Kostenart[] {
  try {
    const stored = localStorage.getItem(KOSTENARTEN_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    
    // Validiere die geladenen Daten
    if (Array.isArray(parsed) && parsed.every(isValidKostenart)) {
      return parsed;
    } else {
      console.warn('Ungültige Kostenarten im Storage gefunden, verwende leeres Array');
      return [];
    }
  } catch (error) {
    console.error('Fehler beim Laden der Kostenarten:', error);
    return [];
  }
}

/**
 * Speichert Kostenarten im localStorage
 */
export function saveKostenarten(kostenarten: Kostenart[]): void {
  try {
    localStorage.setItem(KOSTENARTEN_STORAGE_KEY, JSON.stringify(kostenarten));
    console.log('Kostenarten erfolgreich gespeichert');
  } catch (error) {
    console.error('Fehler beim Speichern der Kostenarten:', error);
  }
}

/**
 * Prüft ob gespeicherte Kostenarten existieren
 */
export function hasKostenarten(): boolean {
  try {
    const stored = localStorage.getItem(KOSTENARTEN_STORAGE_KEY);
    return stored !== null;
  } catch (error) {
    console.error('Fehler beim Prüfen der gespeicherten Kostenarten:', error);
    return false;
  }
}

/**
 * Löscht gespeicherte Kostenarten
 */
export function clearKostenarten(): void {
  try {
    localStorage.removeItem(KOSTENARTEN_STORAGE_KEY);
    console.log('Kostenarten erfolgreich gelöscht');
  } catch (error) {
    console.error('Fehler beim Löschen der Kostenarten:', error);
  }
}

/**
 * Validiert ob die geladenen Daten gültige Kostenarten sind
 */
function isValidKostenart(data: any): data is Kostenart {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.verteilschluesselId === 'string' &&
    typeof data.aktiv === 'boolean' &&
    isValidVerteilschluessel(data.verteilschluesselId)
  );
}

/**
 * Validiert ob der Verteilerschlüssel gültig ist
 */
function isValidVerteilschluessel(schluessel: string): schluessel is Verteilschluessel {
  const validSchluessel: Verteilschluessel[] = [
    'WOHNFLAECHE',
    'MEA',
    'ANZAHL_WOHNUNGEN',
    'VERBRAUCH_WASSER',
    'VERBRAUCH_STROM',
    'VERBRAUCH_WAERME',
    'INDIVIDUELL'
  ];
  return validSchluessel.includes(schluessel as Verteilschluessel);
}

export type Verteilschluessel =
  | 'WOHNFLAECHE'      // Wohnfläche
  | 'MEA'              // Miteigentumsanteil
  | 'ANZAHL_WOHNUNGEN' // Anzahl Wohnungen
  | 'VERBRAUCH_WASSER' // Wasserverbrauch
  | 'VERBRAUCH_STROM'  // Stromverbrauch
  | 'VERBRAUCH_WAERME' // Wärmeverbrauch
  | 'INDIVIDUELL';     // Individuelle Zuweisung






