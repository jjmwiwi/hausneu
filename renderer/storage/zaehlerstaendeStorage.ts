export interface Zaehlerstand {
  zaehlernummer: string; // String-Kennung (aus Zähler)
  jahr: number;          // Zeitraum-Kalenderjahr
  startwert?: number;    // optional
  ablesewert?: number;   // optional
  notiz?: string;        // optional, falls hier ebenfalls editierbar
  updatedAt: string;     // ISO
  einheitId?: string;
}

const KEY = 'zaehlerstaende'; // Array<Zaehlerstand>

/**
 * Lädt gespeicherte Zählerstände aus dem localStorage
 */
export function loadZaehlerstaende(): Zaehlerstand[] {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    
    // Validiere die geladenen Daten
    if (Array.isArray(parsed) && parsed.every(isValidZaehlerstand)) {
      return parsed;
    } else {
      console.warn('Ungültige Zählerstände im Storage gefunden, verwende leeres Array');
      return [];
    }
  } catch (error) {
    console.error('Fehler beim Laden der Zählerstände:', error);
    return [];
  }
}

/**
 * Speichert Zählerstände im localStorage
 */
export function saveZaehlerstaende(list: Zaehlerstand[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    console.log('Zählerstände erfolgreich gespeichert');
  } catch (error) {
    console.error('Fehler beim Speichern der Zählerstände:', error);
  }
}

/**
 * Prüft ob gespeicherte Zählerstände existieren
 */
export function hasZaehlerstaende(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    return stored !== null;
  } catch (error) {
    console.error('Fehler beim Prüfen der gespeicherten Zählerstände:', error);
    return false;
  }
}

/**
 * Löscht gespeicherte Zählerstände
 */
export function clearZaehlerstaende(): void {
  try {
    localStorage.removeItem(KEY);
    console.log('Zählerstände erfolgreich gelöscht');
  } catch (error) {
    console.error('Fehler beim Löschen der Zählerstände:', error);
  }
}

/**
 * Validiert ob die geladenen Daten gültige Zählerstände sind
 */
function isValidZaehlerstand(data: any): data is Zaehlerstand {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.zaehlernummer === 'string' &&
    typeof data.jahr === 'number' &&
    (data.startwert === undefined || typeof data.startwert === 'number') &&
    (data.ablesewert === undefined || typeof data.ablesewert === 'number') &&
    (data.notiz === undefined || typeof data.notiz === 'string') &&
    typeof data.updatedAt === 'string'
  );
}

/**
 * Convenience: Holt einen spezifischen Zählerstand
 */
export function getZaehlerstand(zaehlernummer: string, jahr: number): Zaehlerstand | undefined {
  const zaehlerstaende = loadZaehlerstaende();
  return zaehlerstaende.find(zs => zs.zaehlernummer === zaehlernummer && zs.jahr === jahr);
}

/**
 * Convenience: Aktualisiert oder erstellt einen Zählerstand
 */
export function upsertZaehlerstand(patch: { 
  zaehlernummer: string; 
  jahr: number; 
  startwert?: number; 
  ablesewert?: number; 
  notiz?: string;
  einheitId?: string;
}): void {
  const zaehlerstaende = loadZaehlerstaende();
  const existingIndex = zaehlerstaende.findIndex(
    zs => zs.zaehlernummer === patch.zaehlernummer && zs.jahr === patch.jahr
  );

  const updatedZaehlerstand: Zaehlerstand = {
    zaehlernummer: patch.zaehlernummer,
    jahr: patch.jahr,
    startwert: patch.startwert,
    ablesewert: patch.ablesewert,
    notiz: patch.notiz || '',
    einheitId: patch.einheitId,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    // Bestehenden Eintrag aktualisieren
    zaehlerstaende[existingIndex] = {
      ...zaehlerstaende[existingIndex],
      ...updatedZaehlerstand
    };
    console.log(`[Storage] Bestehenden Zählerstand aktualisiert: ${patch.zaehlernummer} Jahr ${patch.jahr}`);
  } else {
    // Neuen Eintrag hinzufügen
    zaehlerstaende.push(updatedZaehlerstand);
    console.log(`[Storage] Neuen Zählerstand erstellt: ${patch.zaehlernummer} Jahr ${patch.jahr}`);
  }

  saveZaehlerstaende(zaehlerstaende);
  console.log(`[Storage] Zählerstände gespeichert: ${zaehlerstaende.length} Einträge`);
}

/**
 * Utility: Stellt sicher, dass ein Zeitraum existiert
 */
export function ensurePeriod(jahr: number): void {
  const zaehlerstaende = loadZaehlerstaende();
  const existingPeriods = [...new Set(zaehlerstaende.map(zs => zs.jahr))];
  
  if (!existingPeriods.includes(jahr)) {
    console.log(`Zeitraum ${jahr} existiert nicht, wird automatisch angelegt`);
    // Der Zeitraum wird implizit angelegt, wenn der erste Zählerstand gespeichert wird
  }
}




