import { WEGEinheit } from '../contexts/ImmobilienContext';

/**
 * Erstellt ein Dictionary der WEG-Einheiten für schnellen Zugriff
 * @param wegEinheiten Array der WEG-Einheiten
 * @returns Dictionary mit einheitId als Key
 */
export function selectEinheitenById(wegEinheiten: WEGEinheit[]) {
  return Object.fromEntries(wegEinheiten.map(e => [e.id, e]));
}

/**
 * Erstellt ein Dictionary der WEG-Einheiten nach Wohnungsnummer
 * @param wegEinheiten Array der WEG-Einheiten
 * @returns Dictionary mit wohnungsnummer als Key
 */
export function selectEinheitenByWohnungsnummer(wegEinheiten: WEGEinheit[]) {
  return Object.fromEntries(wegEinheiten.map(e => [e.wohnungsnummer, e]));
}

/**
 * Validiert, dass ein Zähler keine verbotenen Anzeigefelder enthält
 * @param zaehler Zähler-Objekt zur Validierung
 * @returns true wenn gültig, false wenn verbotene Felder vorhanden
 */
export function validateZaehlerData(zaehler: any): boolean {
  const verboteneFelder = ['mieterName', 'einheitName', 'unitName', 'mieter', 'einheit'];
  return !verboteneFelder.some(feld => feld in zaehler);
}

