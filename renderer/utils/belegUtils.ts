import { Beleg, WEGEinheit, Kostenart } from '../contexts/ImmobilienContext';

/**
 * Berechnet den Nettobetrag basierend auf Bruttobetrag und MwSt-Satz
 */
export function calculateNetto(betragBrutto: number, mwstSatz: number): number {
  return betragBrutto / (1 + mwstSatz / 100);
}

/**
 * Validiert ob ein Datum im ISO-Format (YYYY-MM-DD) ist
 */
export function isValidISODate(dateString: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validiert ob ein Jahr gültig ist (1900-2100)
 */
export function isValidJahr(jahr: number): boolean {
  return jahr >= 1900 && jahr <= 2100;
}

/**
 * Validiert ob ein MwSt-Satz gültig ist (0-100)
 */
export function isValidMwstSatz(mwstSatz: number): boolean {
  return mwstSatz >= 0 && mwstSatz <= 100;
}

/**
 * Erstellt einen Umlage-Snapshot basierend auf dem Verteilerschlüssel
 */
export function createUmlageSnapshot(
  beleg: Beleg,
  einheiten: WEGEinheit[],
  kostenart: Kostenart
): Beleg['umlageSnapshot'] {
  const { verteilschluesselId, jahr } = beleg;
  
  // Basis für jede Einheit berechnen
  const basis = einheiten.map(einheit => {
    let basisValue = 0;
    
    switch (verteilschluesselId) {
      case 'WOHNFLAECHE':
        basisValue = einheit.wohnflaeche;
        break;
      case 'MEA':
        basisValue = einheit.miteigentumsAnteil;
        break;
      case 'ANZAHL_WOHNUNGEN':
        basisValue = 1; // Jede Einheit = 1 Wohnung
        break;
      case 'VERBRAUCH_WASSER':
      case 'VERBRAUCH_STROM':
      case 'VERBRAUCH_WAERME':
        // Für Verbrauch-basierte Verteilung: Standardmäßig MEA verwenden
        basisValue = einheit.miteigentumsAnteil;
        break;
      case 'INDIVIDUELL':
        // Für individuelle Verteilung: Standardmäßig MEA verwenden
        basisValue = einheit.miteigentumsAnteil;
        break;
      default:
        basisValue = einheit.miteigentumsAnteil;
    }
    
    return { einheitId: einheit.id, basis: basisValue };
  });
  
  // Gesamtsumme der Basis
  const summeBasis = basis.reduce((sum, item) => sum + item.basis, 0);
  
  // Anteile und Beträge berechnen
  const anteile = basis.map(item => {
    const prozent = summeBasis > 0 ? (item.basis / summeBasis) * 100 : 0;
    const betrag = (prozent / 100) * beleg.netto;
    
    return {
      einheitId: item.einheitId,
      prozent: Math.round(prozent * 100) / 100, // Auf 2 Dezimalstellen runden
      betrag: Math.round(betrag * 100) / 100    // Auf 2 Dezimalstellen runden
    };
  });
  
  // Gesamtsumme der Anteile (sollte dem Nettobetrag entsprechen)
  const summeAnteile = anteile.reduce((sum, item) => sum + item.betrag, 0);
  
  // Fallback-Verteilerschlüssel bestimmen
  let fallback: 'wohnflaeche' | 'mea' | null = null;
  if (verteilschluesselId === 'VERBRAUCH_WASSER' || 
      verteilschluesselId === 'VERBRAUCH_STROM' || 
      verteilschluesselId === 'VERBRAUCH_WAERME') {
    fallback = 'mea';
  }
  
  // Hinweise sammeln
  const hinweise: string[] = [];
  if (Math.abs(summeAnteile - beleg.netto) > 0.01) {
    hinweise.push(`Rundungsdifferenz: ${Math.abs(summeAnteile - beleg.netto).toFixed(2)}€`);
  }
  if (verteilschluesselId === 'INDIVIDUELL') {
    hinweise.push('Individuelle Verteilung - manuelle Anpassung erforderlich');
  }
  
  return {
    jahr,
    verteilschluesselId,
    basis,
    anteile,
    summe: summeAnteile,
    fallback,
    hinweise
  };
}

/**
 * Validiert einen Beleg vor dem Speichern
 */
export function validateBeleg(beleg: Partial<Beleg>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!beleg.wegId) errors.push('WEG-ID ist erforderlich');
  if (!beleg.belegname?.trim()) errors.push('Belegname ist erforderlich');
  if (typeof beleg.betragBrutto !== 'number' || beleg.betragBrutto === 0) {
    errors.push('Gültiger Bruttobetrag ist erforderlich');
  }
  if (typeof beleg.mwstSatz !== 'number' || !isValidMwstSatz(beleg.mwstSatz)) {
    errors.push('Gültiger MwSt-Satz ist erforderlich (0-100)');
  }
  if (!beleg.kostenartId) errors.push('Kostenart ist erforderlich');
  if (!beleg.verteilschluesselId) errors.push('Verteilerschlüssel ist erforderlich');
  if (!beleg.jahr || !isValidJahr(beleg.jahr)) errors.push('Gültiges Jahr ist erforderlich');
  if (!beleg.datum || !isValidISODate(beleg.datum)) errors.push('Gültiges Datum ist erforderlich (YYYY-MM-DD)');
  if (!beleg.periodeVon || !isValidISODate(beleg.periodeVon)) {
    errors.push('Gültiger Periodenstart ist erforderlich (YYYY-MM-DD)');
  }
  if (!beleg.periodeBis || !isValidISODate(beleg.periodeBis)) {
    errors.push('Gültiges Periodenende ist erforderlich (YYYY-MM-DD)');
  }
  
  // Prüfe ob Periode dem Jahr entspricht
  if (beleg.jahr && beleg.periodeVon && beleg.periodeBis) {
    const startJahr = parseInt(beleg.periodeVon.substring(0, 4));
    const endJahr = parseInt(beleg.periodeBis.substring(0, 4));
    
    if (startJahr !== beleg.jahr || endJahr !== beleg.jahr) {
      errors.push('Periode muss dem Abrechnungsjahr entsprechen');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formatiert einen Betrag als Währung
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

/**
 * Formatiert ein Datum im deutschen Format mit führenden Nullen
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Fallback bei ungültigem Datum
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (error) {
    console.error('Fehler beim Formatieren des Datums:', error);
    return dateString;
  }
}

/**
 * Formatiert einen Prozentsatz
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
