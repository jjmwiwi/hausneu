import { Beleg } from '../contexts/ImmobilienContext';

const BELEG_STORAGE_KEY = 'hausverwaltung-belege';

/**
 * Lädt gespeicherte Belege aus dem localStorage
 */
export function loadBelege(): Beleg[] {
  try {
    const stored = localStorage.getItem(BELEG_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    
    // Validiere die geladenen Daten
    if (Array.isArray(parsed) && parsed.every(isValidBeleg)) {
      return parsed;
    } else {
      console.warn('Ungültige Belege im Storage gefunden, verwende leeres Array');
      return [];
    }
  } catch (error) {
    console.error('Fehler beim Laden der Belege:', error);
    return [];
  }
}

/**
 * Speichert Belege im localStorage
 */
export function saveBelege(belege: Beleg[]): void {
  try {
    localStorage.setItem(BELEG_STORAGE_KEY, JSON.stringify(belege));
    console.log('Belege erfolgreich gespeichert');
  } catch (error) {
    console.error('Fehler beim Speichern der Belege:', error);
  }
}

/**
 * Prüft ob gespeicherte Belege existieren
 */
export function hasBelege(): boolean {
  try {
    const stored = localStorage.getItem(BELEG_STORAGE_KEY);
    return stored !== null;
  } catch (error) {
    console.error('Fehler beim Prüfen der gespeicherten Belege:', error);
    return false;
  }
}

/**
 * Löscht gespeicherte Belege
 */
export function clearBelege(): void {
  try {
    localStorage.removeItem(BELEG_STORAGE_KEY);
    console.log('Belege erfolgreich gelöscht');
  } catch (error) {
    console.error('Fehler beim Löschen der Belege:', error);
  }
}

/**
 * Validiert ob die geladenen Daten gültige Belege sind
 */
function isValidBeleg(data: any): data is Beleg {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.wegId === 'string' &&
    typeof data.datum === 'string' &&
    typeof data.belegname === 'string' &&
    typeof data.betragBrutto === 'number' &&
    typeof data.mwstSatz === 'number' &&
    typeof data.netto === 'number' &&
    typeof data.kostenartId === 'string' &&
    typeof data.verteilschluesselId === 'string' &&
    typeof data.jahr === 'number' &&
    typeof data.periodeVon === 'string' &&
    typeof data.periodeBis === 'string' &&
    typeof data.status === 'string' &&
    typeof data.abgerechnet === 'boolean' &&
    typeof data.umlageQuelle === 'string' &&
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string'
  );
}

/**
 * Erstellt einen neuen Beleg
 */
export function createBeleg(beleg: Omit<Beleg, 'id' | 'createdAt' | 'updatedAt'>): Beleg {
  const newBeleg: Beleg = {
    ...beleg,
    id: `beleg-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const existingBelege = loadBelege();
  const updatedBelege = [...existingBelege, newBeleg];
  saveBelege(updatedBelege);
  
  return newBeleg;
}

/**
 * Aktualisiert einen bestehenden Beleg
 */
export function updateBeleg(id: string, updates: Partial<Beleg>): Beleg | null {
  const existingBelege = loadBelege();
  const belegIndex = existingBelege.findIndex(b => b.id === id);
  
  if (belegIndex === -1) {
    console.warn(`Beleg mit ID ${id} nicht gefunden`);
    return null;
  }
  
  const updatedBeleg: Beleg = {
    ...existingBelege[belegIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  existingBelege[belegIndex] = updatedBeleg;
  saveBelege(existingBelege);
  
  return updatedBeleg;
}

/**
 * Löscht einen Beleg
 */
export function deleteBeleg(id: string): boolean {
  const existingBelege = loadBelege();
  const filteredBelege = existingBelege.filter(b => b.id !== id);
  
  if (filteredBelege.length === existingBelege.length) {
    console.warn(`Beleg mit ID ${id} nicht gefunden`);
    return false;
  }
  
  saveBelege(filteredBelege);
  return true;
}

/**
 * Findet Belege nach WEG-ID
 */
export function findBelegeByWegId(wegId: string): Beleg[] {
  const allBelege = loadBelege();
  return allBelege.filter(b => b.wegId === wegId);
}

/**
 * Findet Belege nach Jahr
 */
export function findBelegeByJahr(jahr: number): Beleg[] {
  const allBelege = loadBelege();
  return allBelege.filter(b => b.jahr === jahr);
}

/**
 * Findet Belege nach Kostenart
 */
export function findBelegeByKostenart(kostenartId: string): Beleg[] {
  const allBelege = loadBelege();
  return allBelege.filter(b => b.kostenartId === kostenartId);
}
