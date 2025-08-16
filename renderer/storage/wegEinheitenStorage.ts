import { WEGEinheit } from '../contexts/ImmobilienContext';

const STORAGE_KEY = 'wegEinheiten';

/**
 * Lädt gespeicherte WEG-Einheiten aus dem persistenten Speicher
 * @returns Array der gespeicherten WEG-Einheiten oder leeres Array
 */
export function loadWEGEinheiten(): WEGEinheit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    
    // Validiere die geladenen Daten
    if (Array.isArray(parsed) && parsed.every(isValidWEGEinheit)) {
      return parsed;
    }
    
    console.warn('Ungültige WEG-Einheiten-Daten im Storage gefunden, versuche zu reparieren');
    
    // Versuche die Daten zu reparieren
    if (Array.isArray(parsed)) {
      const repaired = repairWEGEinheiten(parsed);
      console.log('WEG-Einheiten erfolgreich repariert');
      return repaired;
    }
    
    return [];
  } catch (error) {
    console.error('Fehler beim Laden der WEG-Einheiten:', error);
    return [];
  }
}

/**
 * Speichert WEG-Einheiten persistent
 * @param einheiten Array der zu speichernden WEG-Einheiten
 */
export function saveWEGEinheiten(einheiten: WEGEinheit[]): void {
  try {
    // Validiere die zu speichernden Daten
    if (!Array.isArray(einheiten) || !einheiten.every(isValidWEGEinheit)) {
      throw new Error('Ungültige WEG-Einheiten-Daten zum Speichern');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(einheiten));
    console.log(`${einheiten.length} WEG-Einheiten erfolgreich gespeichert`);
  } catch (error) {
    console.error('Fehler beim Speichern der WEG-Einheiten:', error);
    throw error;
  }
}

/**
 * Validiert ob ein Objekt eine gültige WEGEinheit ist
 */
function isValidWEGEinheit(obj: any): obj is WEGEinheit {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.titel === 'string' &&
    typeof obj.wohnungsnummer === 'number' &&
    (obj.mieter === undefined || typeof obj.mieter === 'string') &&
    (obj.email === undefined || typeof obj.email === 'string') &&
    (obj.telefon === undefined || typeof obj.telefon === 'string') &&
    (obj.wohnflaeche === undefined || typeof obj.wohnflaeche === 'number') &&
    (obj.miteigentumsAnteil === undefined || typeof obj.miteigentumsAnteil === 'number')
  );
}

/**
 * Löscht alle gespeicherten WEG-Einheiten
 */
export function clearWEGEinheiten(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('WEG-Einheiten erfolgreich gelöscht');
  } catch (error) {
    console.error('Fehler beim Löschen der WEG-Einheiten:', error);
    throw error;
  }
}

/**
 * Prüft ob gespeicherte WEG-Einheiten existieren
 */
export function hasStoredWEGEinheiten(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw !== null && raw !== '';
  } catch (error) {
    console.error('Fehler beim Prüfen der gespeicherten WEG-Einheiten:', error);
    return false;
  }
}

/**
 * Repariert WEG-Einheiten, die unvollständige Daten haben
 */
export function repairWEGEinheiten(einheiten: WEGEinheit[]): WEGEinheit[] {
  const defaultWEGEinheiten = [
    { id: '1', wegId: 'weg-1', titel: 'Wohnung Haus oben', wohnungsnummer: 4, mieter: 'Rudolf Klee', email: 'klee@example.de', telefon: '01718327771', wohnflaeche: 120, miteigentumsAnteil: 25 },
    { id: '2', wegId: 'weg-1', titel: 'Wohnung Haus unten', wohnungsnummer: 3, mieter: 'Rudolf Klee', email: 'klee@example.de', telefon: '01718327771', wohnflaeche: 110, miteigentumsAnteil: 23 },
    { id: '3', wegId: 'weg-1', titel: 'Wohnung Haus vorne', wohnungsnummer: 2, mieter: 'Amerika', email: 'amerika@example.de', telefon: '01718327772', wohnflaeche: 95, miteigentumsAnteil: 20 },
    { id: '4', wegId: 'weg-1', titel: 'Wohnung Keller vorne', wohnungsnummer: 1, mieter: 'Jürgen Müller', email: 'mueller@example.de', telefon: '01718327773', wohnflaeche: 85, miteigentumsAnteil: 18 }
  ];

  return einheiten.map(einheit => {
    // Finde die entsprechende Standardeinheit basierend auf der Wohnungsnummer
    const defaultEinheit = defaultWEGEinheiten.find(d => d.wohnungsnummer === einheit.wohnungsnummer);
    
    if (defaultEinheit) {
      // Ergänze fehlende Felder mit Standardwerten
      return {
        ...defaultEinheit,
        ...einheit, // Überschreibe mit den gespeicherten Werten
        // Stelle sicher, dass MAE und andere wichtige Felder gesetzt sind
        miteigentumsAnteil: einheit.miteigentumsAnteil || defaultEinheit.miteigentumsAnteil,
        wohnflaeche: einheit.wohnflaeche || defaultEinheit.wohnflaeche,
        email: einheit.email || defaultEinheit.email,
        telefon: einheit.telefon || defaultEinheit.telefon
      };
    }
    
    // Fallback: Verwende die ursprüngliche Einheit
    return einheit;
  });
}

