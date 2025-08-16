export interface AbleseStatus {
  jahr: number;
  isComplete: boolean;       // einmal auf true gesetzt → bleibt true, bis man manuell zurücksetzt
  completedAt?: string;      // ISO
  meterSnapshot?: string[];  // Liste der Zählernummern, die beim „vollständig" Status vorhanden waren
}

const KEY = 'zaehlerstaende_status'; // Array<AbleseStatus>

/**
 * Lädt gespeicherte Ablese-Status aus dem persistenten Speicher
 */
export function loadAbleseStatus(): AbleseStatus[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    
    if (Array.isArray(parsed) && parsed.every(isValidAbleseStatus)) {
      return parsed;
    }
    
    console.warn('Ungültige Ablese-Status-Daten im Storage gefunden');
    return [];
  } catch (error) {
    console.error('Fehler beim Laden der Ablese-Status:', error);
    return [];
  }
}

/**
 * Speichert Ablese-Status persistent
 */
export function saveAbleseStatus(list: AbleseStatus[]): void {
  try {
    if (!Array.isArray(list) || !list.every(isValidAbleseStatus)) {
      throw new Error('Ungültige Ablese-Status-Daten zum Speichern');
    }
    
    localStorage.setItem(KEY, JSON.stringify(list));
    console.log(`${list.length} Ablese-Status erfolgreich gespeichert`);
  } catch (error) {
    console.error('Fehler beim Speichern der Ablese-Status:', error);
    throw error;
  }
}

/**
 * Validiert ob ein Objekt eine gültige AbleseStatus ist
 */
function isValidAbleseStatus(obj: any): obj is AbleseStatus {
  return (
    obj &&
    typeof obj.jahr === 'number' &&
    typeof obj.isComplete === 'boolean' &&
    (obj.completedAt === undefined || typeof obj.completedAt === 'string') &&
    (obj.meterSnapshot === undefined || Array.isArray(obj.meterSnapshot))
  );
}

/**
 * Holt den Status für ein bestimmtes Jahr
 */
export function getStatus(jahr: number): AbleseStatus | undefined {
  const statusList = loadAbleseStatus();
  return statusList.find(s => s.jahr === jahr);
}

/**
 * Setzt einen Zeitraum als vollständig abgeschlossen
 */
export function setComplete(jahr: number, meterSnapshot: string[]): void {
  const statusList = loadAbleseStatus();
  const existingIndex = statusList.findIndex(s => s.jahr === jahr);
  
  const newStatus: AbleseStatus = {
    jahr,
    isComplete: true,
    completedAt: new Date().toISOString(),
    meterSnapshot
  };
  
  if (existingIndex >= 0) {
    statusList[existingIndex] = newStatus;
  } else {
    statusList.push(newStatus);
  }
  
  saveAbleseStatus(statusList);
  console.log(`Jahr ${jahr} als vollständig markiert`);
}

/**
 * Setzt den Status eines Zeitraums zurück
 */
export function resetComplete(jahr: number): void {
  const statusList = loadAbleseStatus();
  const existingIndex = statusList.findIndex(s => s.jahr === jahr);
  
  if (existingIndex >= 0) {
    statusList.splice(existingIndex, 1);
    saveAbleseStatus(statusList);
    console.log(`Status für Jahr ${jahr} zurückgesetzt`);
  }
}

/**
 * Prüft ob ein Jahr vollständig ist (ohne neu zu berechnen)
 */
export function isYearComplete(jahr: number): boolean {
  const status = getStatus(jahr);
  return status?.isComplete === true;
}

/**
 * Prüft automatisch, ob alle Zähler für ein Jahr vollständig sind
 * und aktualisiert den Status entsprechend
 */
export function checkAndUpdateYearCompleteness(jahr: number, zaehler: any[]): boolean {
  try {
    console.log(`[zaehlerstaendeStatus] Prüfe Vollständigkeit für Jahr ${jahr}`);
    
    // Prüfe, ob alle Zähler Start- und Ablesewerte für das Jahr haben
    const incompleteZaehler = zaehler.filter(zaehler => {
      // Prüfe, ob der Zähler Start- und Ablesewerte für das Jahr hat
      const hasStartwert = zaehler.startwert !== null && zaehler.startwert !== undefined;
      const hasAblesewert = zaehler.ablesewert !== null && zaehler.ablesewert !== undefined;
      
      if (!hasStartwert || !hasAblesewert) {
        console.log(`[zaehlerstaendeStatus] Zähler ${zaehler.zaehlernummer} unvollständig: startwert=${hasStartwert}, ablesewert=${hasAblesewert}`);
      }
      
      return !hasStartwert || !hasAblesewert;
    });
    
    const isComplete = incompleteZaehler.length === 0;
    
    if (isComplete) {
      // Alle Zähler sind vollständig - setze Status auf vollständig
      const meterSnapshot = zaehler.map(z => z.zaehlernummer);
      setComplete(jahr, meterSnapshot);
      console.log(`[zaehlerstaendeStatus] Jahr ${jahr} automatisch als vollständig markiert`);
    } else {
      // Nicht alle Zähler sind vollständig - setze Status zurück
      resetComplete(jahr);
      console.log(`[zaehlerstaendeStatus] Jahr ${jahr} als unvollständig markiert (${incompleteZaehler.length} unvollständige Zähler)`);
    }
    
    return isComplete;
  } catch (error) {
    console.error(`[zaehlerstaendeStatus] Fehler bei Vollständigkeitsprüfung für Jahr ${jahr}:`, error);
    return false;
  }
}
