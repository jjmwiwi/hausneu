/**
 * Zentrale Definition aller Page-IDs für Debug-Anzeigen
 * 
 * Verwendung: Import in Komponenten und als debugId weitergeben
 */

export const PAGE_IDS = {
  // WEG-Verwaltung
  WEG_STAMMDATEN: 'weg-stammdaten',
  WEG_EINHEITEN: 'weg-einheiten',
  KOSTENARTEN: 'kostenarten',
  
  // Zähler-Management
  ZAEHLERSTAND: 'zaehlerstand',
  ZAEHLER_UEBERSICHT: 'zaehler-uebersicht',
  ABLESUNGEN: 'ablesungen',
  ABLESEPROTOKOLL: 'ableseprotokoll',
  
  // Buchhaltung & Abrechnung
  BUCHHALTUNG: 'buchhaltung',
  BUCHHALTUNG_BELEGE: 'buchhaltung-belege',
  BUCHHALTUNG_UMLAGE: 'buchhaltung-umlage',
  BETRIEBSKOSTENABRECHNUNG: 'betriebskostenabrechnung',
  HEIZKOSTEN: 'heizkosten',
  VORAUSZAHLUNGEN: 'vorauszahlungen',
  
  // Belege & Umlagen
  BELEGE: 'belege',
  UMLAGE: 'umlage',
  
  // Immobilien-Übersicht
  IMMOBILIEN_UEBERSICHT: 'immobilien-uebersicht',
  IMMOBILIE_DETAIL: 'immobilie-detail'
} as const;

export type PageId = typeof PAGE_IDS[keyof typeof PAGE_IDS];
