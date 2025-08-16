import { Zaehler } from '../components/ZaehlerUebersichtPage';

const STORAGE_KEY = 'zaehler';

export async function loadZaehler(): Promise<Zaehler[]> {
  try {
    // WICHTIG: Lade Daten aus beiden Quellen (IndexedDB und localStorage)
    let allZaehler: Zaehler[] = [];
    
    // 1. Versuche IndexedDB zu laden
    try {
      // Importiere den zaehlerService dynamisch
      const { default: zaehlerService } = await import('../../src/services/zaehler.service');
      
      // Lade alle Zähler aus dem Service (der lädt aus beiden Quellen)
      const wegIds = ['test-weg', 'default-weg']; // Bekannte WEG-IDs
      for (const wegId of wegIds) {
        try {
          const zaehler = await zaehlerService.list(wegId);
          allZaehler.push(...zaehler);
        } catch (error) {
          console.warn(`Fehler beim Laden der Zähler für WEG ${wegId}:`, error);
        }
      }
      
      console.log(`[zaehlerStorage] ${allZaehler.length} Zähler aus IndexedDB geladen`);
    } catch (indexedDBError) {
      console.warn('[zaehlerStorage] IndexedDB-Laden fehlgeschlagen, verwende localStorage:', indexedDBError);
    }
    
    // 2. Fallback: localStorage
    if (allZaehler.length === 0) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        
        // Validiere die geladenen Daten
        if (Array.isArray(parsed) && parsed.every(isValidZaehler)) {
          allZaehler = parsed;
          console.log(`[zaehlerStorage] ${allZaehler.length} Zähler aus localStorage geladen (Fallback)`);
        } else {
          console.warn('[zaehlerStorage] Ungültige Zähler-Daten im localStorage gefunden');
        }
      }
    }
    
    // 3. Entferne Duplikate und temp-IDs
    const uniqueZaehler = allZaehler.filter((zaehler, index, self) => 
      !zaehler.id.startsWith('temp:') && 
      index === self.findIndex(z => z.id === zaehler.id)
    );
    
    console.log(`[zaehlerStorage] Finale Zähler: ${uniqueZaehler.length} (${uniqueZaehler.map(z => z.notiz || 'keine Notiz').join(', ')})`);
    
    return uniqueZaehler;
  } catch (error) {
    console.error('[zaehlerStorage] Fehler beim Laden der Zähler:', error);
    return [];
  }
}

export function saveZaehler(zaehler: Zaehler[]): void {
  try {
    // Validiere die zu speichernden Daten
    if (!Array.isArray(zaehler) || !zaehler.every(isValidZaehler)) {
      throw new Error('Ungültige Zähler-Daten zum Speichern');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(zaehler));
    console.log(`${zaehler.length} Zähler erfolgreich gespeichert`);
  } catch (error) {
    console.error('Fehler beim Speichern der Zähler:', error);
    throw error;
  }
}

function isValidZaehler(obj: any): obj is Zaehler {
  // Prüfe auf verbotene Anzeigefelder
  const verboteneFelder = ['mieterName', 'einheitName', 'unitName', 'mieter', 'einheit'];
  const hatVerboteneFelder = verboteneFelder.some(feld => feld in obj);
  
  if (hatVerboteneFelder) {
    console.error('Zähler enthält verbotene Anzeigefelder:', obj);
    return false;
  }
  
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.zaehlernummer === 'string' &&
    typeof obj.bezeichnung === 'string' &&
    typeof obj.zaehlertyp === 'string' &&
    typeof obj.standort === 'string' &&
    typeof obj.einheitId === 'string' &&
    typeof obj.notiz === 'string'
  );
}

export function clearZaehler(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Zähler erfolgreich gelöscht');
  } catch (error) {
    console.error('Fehler beim Löschen der Zähler:', error);
    throw error;
  }
}

export function hasStoredZaehler(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw !== null && raw !== '';
  } catch (error) {
    console.error('Fehler beim Prüfen der gespeicherten Zähler:', error);
    return false;
  }
}
