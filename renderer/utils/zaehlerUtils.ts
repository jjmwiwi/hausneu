import { Zaehler } from '../../src/types/zaehler.types';
import { WEGEinheit } from '../contexts/ImmobilienContext';

/**
 * Prüft, ob eine Einheit eine Allgemein-Einheit ist
 */
export const isAllgemeinEinheit = (e: WEGEinheit | { id: string; name?: string; titel?: string }) =>
  e?.id === 'allgemein' || e?.titel?.toLowerCase() === 'allgemein';

/**
 * Findet die Allgemein-Einheit in einer Einheiten-Liste
 */
export function getAllgemeinEinheit(einheiten: WEGEinheit[]): WEGEinheit | undefined {
  return einheiten.find(isAllgemeinEinheit);
}

/**
 * Sortiert Einheiten: Allgemein zuerst, dann nach Wohnungsnummer
 */
export function sortEinheiten(einheiten: WEGEinheit[]): WEGEinheit[] {
  return [...einheiten].sort((a, b) => {
    if (a.id === 'allgemein') return -1;
    if (b.id === 'allgemein') return 1;
    return a.wohnungsnummer - b.wohnungsnummer;
  });
}

/**
 * Sortiert Zähler innerhalb einer Einheit nach Zählernummer (natürliche Sortierung)
 */
export function sortZaehlerByNummer(zaehler: Zaehler[]): Zaehler[] {
  return [...zaehler].sort((a, b) => {
    // Numerische Sortierung bevorzugen
    const aNum = parseInt(a.zaehlernummer) || 0;
    const bNum = parseInt(b.zaehlernummer) || 0;
    if (aNum !== bNum) return aNum - bNum;
    return a.zaehlernummer.localeCompare(b.zaehlernummer);
  });
}

/**
 * Gruppiert Zähler nach Einheit und sortiert sie (idempotent & null-sicher)
 */
export function groupAndSortZaehler(zaehler: Zaehler[], einheiten: WEGEinheit[]): Array<{ einheit: any; items: Zaehler[] }> {
  const map = new Map<string, { einheit: any; items: Zaehler[] }>();

  // Alle bekannten Einheiten vorbereiten
  for (const e of (einheiten ?? [])) {
    if (!e?.id) continue;
    map.set(e.id, { einheit: e, items: [] });
  }

  // Fallback Allgemein-Einheit erzwingen
  let common = [...map.values()].find(g => isAllgemeinEinheit(g.einheit))?.einheit;
  if (!common) {
    common = { 
      id: 'allgemein', 
      titel: 'Allgemein', 
      mieter: 'Gemeinschaft', 
      typ: 'ALLGEMEIN',
      ordnung: 0
    } as any;
    map.set(common.id, { einheit: common, items: [] });
  }

  // Gruppiere Zähler
  for (const z of (zaehler ?? [])) {
    if (!z?.id) continue; // Überspringe ungültige Zähler
    
    const eid = z?.einheitId ?? common.id;
    const bucket = map.get(eid) ?? map.get(common.id);
    
    if (bucket) {
      // IMMUTABLE: Erstelle neue Array-Referenz
      bucket.items = [...bucket.items, z];
    } else {
      // Letzter Fallback: Erstelle neue Allgemein-Gruppe
      console.warn('[zaehlerUtils] Erstelle neue Allgemein-Gruppe für Zähler', { 
        zaehlerId: z.id, 
        einheitId: z.einheitId 
      });
      map.set(common.id, { einheit: common, items: [z] });
    }
  }

  // Nur Gruppen mit Inhalt
  const groups = [...map.values()].filter(g => g.items.length > 0);

  // IMMUTABLE: Erstelle neue Array-Referenz für Sortierung
  const sortedGroups = [...groups].sort((a, b) => {
    const aCommon = isAllgemeinEinheit(a.einheit) ? -1 : 0;
    const bCommon = isAllgemeinEinheit(b.einheit) ? -1 : 0;
    if (aCommon !== bCommon) return aCommon - bCommon;
    return (a.einheit.ordnung ?? 0) - (b.einheit.ordnung ?? 0);
  });

  return sortedGroups;
}

/**
 * Gruppiert Zähler nach Einheit mit Einheiten-Referenz (erweiterte Version)
 */
export function groupAndSortZaehlerWithEinheiten(zaehler: Zaehler[], einheiten: WEGEinheit[]) {
  const common = getAllgemeinEinheit(einheiten);
  const byEinheitId = new Map<string, { einheit: WEGEinheit; items: Zaehler[] }>();

  // Initialisiere alle Einheiten
  for (const e of einheiten) {
    byEinheitId.set(e.id, { einheit: e, items: [] });
  }
  
  // Füge Allgemein-Einheit hinzu, falls nicht vorhanden
  if (common && !byEinheitId.has('allgemein')) {
    byEinheitId.set('allgemein', { einheit: common, items: [] });
  }

  // Gruppiere Zähler
  for (const z of zaehler) {
    const eid = z.einheitId ?? 'allgemein';
    const bucket = byEinheitId.get(eid);
    
    if (bucket) {
      // IMMUTABLE: Erstelle neue Array-Referenz
      bucket.items = [...bucket.items, z];
    } else if (eid === 'allgemein' && common) {
      // Fallback für Allgemein-Zähler
      const allgemeinBucket = byEinheitId.get('allgemein');
      if (allgemeinBucket) {
        // IMMUTABLE: Erstelle neue Array-Referenz
        allgemeinBucket.items = [...allgemeinBucket.items, z];
      }
    }
  }

  // Sortiere Gruppen: Allgemein immer zuerst, dann nach Ordnung
  const groups = Array.from(byEinheitId.values()).filter(g => g.items.length > 0);
  // IMMUTABLE: Erstelle neue Array-Referenz für Sortierung
  const sortedGroups = [...groups].sort((a, b) => {
    const aa = isAllgemeinEinheit(a.einheit) ? -1 : 0;
    const bb = isAllgemeinEinheit(b.einheit) ? -1 : 0;
    if (aa !== bb) return aa - bb;
    return (a.einheit.wohnungsnummer ?? 0) - (b.einheit.wohnungsnummer ?? 0);
  });
  
  return sortedGroups;
}

/**
 * Erstellt ein Einheiten-Array mit "allgemein" für die UI
 */
export function createEinheitenForUI(wegEinheiten: WEGEinheit[]) {
  const result = [
    { 
      id: 'allgemein', 
      name: 'Allgemein', 
      mieterName: 'Gemeinschaft', 
      ordnung: 0,
      titel: 'Gemeinschaft',
      mieter: 'Gemeinschaft',
      isCommon: true,
      typ: 'ALLGEMEIN'
    }
  ];
  
  // Füge alle WEG-Einheiten hinzu
  const allEinheiten = wegEinheiten.map(einheit => ({
    id: einheit.id,
    name: einheit.titel,
    mieterName: einheit.mieter || 'Eigentümer',
    ordnung: einheit.wohnungsnummer,
    titel: einheit.titel,
    mieter: einheit.mieter || 'Eigentümer',
    isCommon: false,
    typ: 'WOHNUNG'
  }));
  
  // IMMUTABLE: Kombiniere Arrays ohne Mutation
  return [...result, ...allEinheiten];
}
