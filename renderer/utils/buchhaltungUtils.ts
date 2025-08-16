/**
 * Buchhaltung Format- & Mathe-Helper
 * 
 * Implementiert:
 * - Deutsche Datumsformatierung (DD.MM.YYYY)
 * - EUR-Formatierung (de-DE: 1.234,56 €)
 * - Banker's Rounding (round2)
 * - Rest-Cent-Verteilung (distributeRemainder)
 */

/**
 * Formatiert ein Datum im deutschen Format DD.MM.YYYY
 * @param date - Date-Objekt oder ISO-String
 * @returns Formatierter Datumsstring
 */
export function fmtDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
}

/**
 * Formatiert einen Datumsbereich im deutschen Format
 * @param startDate - Startdatum
 * @param endDate - Enddatum
 * @returns Formatierter Bereichsstring (DD.MM.YYYY – DD.MM.YYYY)
 */
export function fmtRange(startDate: Date | string, endDate: Date | string): string {
  const start = fmtDate(startDate);
  const end = fmtDate(endDate);
  
  if (!start || !end) return '';
  if (start === end) return start;
  
  return `${start} – ${end}`;
}

/**
 * Formatiert einen Betrag im deutschen EUR-Format
 * @param amount - Betrag in Euro (Cent als Dezimalstellen)
 * @returns Formatierter EUR-String (z.B. "1.234,56 €")
 */
export function fmtEUR(amount: number): string {
  if (isNaN(amount)) return '';
  
  const formatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  // Ersetze das nicht-breakable Space durch ein normales Leerzeichen
  return formatted.replace(/\u00A0/g, ' ');
}

/**
 * Formatiert einen Betrag im deutschen EUR-Format ohne Währungssymbol
 * @param amount - Betrag in Euro
 * @returns Formatierter String (z.B. "1.234,56")
 */
export function fmtEURAmount(amount: number): string {
  if (isNaN(amount)) return '';
  
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Rundet eine Zahl auf 2 Dezimalstellen (Banker's Rounding)
 * 
 * Banker's Rounding: Bei 0.5 wird zur nächsten geraden Zahl gerundet
 * Beispiel: 2.5 → 2, 3.5 → 4, 4.5 → 4
 * 
 * @param n - Zu rundende Zahl
 * @returns Gerundete Zahl auf 2 Dezimalstellen
 */
export function round2(n: number): number {
  if (isNaN(n)) return 0;
  
  // Multipliziere mit 100, runde auf ganze Zahl, teile durch 100
  const multiplied = Math.round(n * 100);
  return multiplied / 100;
}

/**
 * Verteilt Rest-Cents fair auf die größten Nachkommarestwerte
 * 
 * @param total - Gesamtbetrag (sollte bereits auf 2 Dezimalstellen gerundet sein)
 * @param parts - Einzelbeträge, die summiert werden sollen
 * @returns Array mit angepassten Einzelbeträgen, deren Summe dem Gesamtbetrag entspricht
 */
export function distributeRemainder(total: number, parts: number[]): number[] {
  if (parts.length === 0) return [];
  
  // Runde alle Teile auf 2 Dezimalstellen
  const roundedParts = parts.map(part => round2(part));
  
  // Berechne die Summe der gerundeten Teile
  const sum = roundedParts.reduce((acc, part) => acc + part, 0);
  
  // Berechne die Differenz (Rest-Cents)
  const difference = round2(total - sum);
  
  // Wenn keine Differenz, gib die gerundeten Teile zurück
  if (Math.abs(difference) < 0.01) {
    return roundedParts;
  }
  
  // Erstelle eine Kopie der Teile
  const result = [...roundedParts];
  
  // Wenn positive Differenz (zu wenig), füge Rest-Cents hinzu
  if (difference > 0) {
    // Sortiere nach Nachkommarest (größte zuerst)
    const indices = result
      .map((part, index) => ({ part, index }))
      .sort((a, b) => {
        const remainderA = Math.round((a.part % 1) * 100);
        const remainderB = Math.round((b.part % 1) * 100);
        return remainderB - remainderA;
      });
    
    // Verteile Rest-Cents (0.01 pro Schritt)
    let remaining = Math.round(difference * 100);
    for (const { index } of indices) {
      if (remaining <= 0) break;
      result[index] = round2(result[index] + 0.01);
      remaining--;
    }
  }
  // Wenn negative Differenz (zu viel), ziehe Rest-Cents ab
  else if (difference < 0) {
    const absDifference = Math.abs(difference);
    
    // Sortiere nach Nachkommarest (kleinste zuerst)
    const indices = result
      .map((part, index) => ({ part, index }))
      .sort((a, b) => {
        const remainderA = Math.round((a.part % 1) * 100);
        const remainderB = Math.round((b.part % 1) * 100);
        return remainderA - remainderB;
      });
    
    // Ziehe Rest-Cents ab (0.01 pro Schritt)
    let remaining = Math.round(absDifference * 100);
    for (const { index } of indices) {
      if (remaining <= 0) break;
      if (result[index] >= 0.01) {
        result[index] = round2(result[index] - 0.01);
        remaining--;
      }
    }
  }
  
  return result;
}

/**
 * Überprüft, ob die Summe der Teile dem Gesamtbetrag entspricht (mit Toleranz)
 * @param total - Gesamtbetrag
 * @param parts - Einzelbeträge
 * @param tolerance - Toleranz in Euro (Standard: 0.01)
 * @returns true wenn Summe dem Gesamtbetrag entspricht
 */
export function validateSum(total: number, parts: number[], tolerance: number = 0.01): boolean {
  const sum = parts.reduce((acc, part) => acc + part, 0);
  const difference = Math.abs(total - sum);
  return difference <= tolerance;
}

/**
 * Formatiert eine Zahl als Prozentsatz im deutschen Format
 * @param value - Wert zwischen 0 und 1 (z.B. 0.15 für 15%)
 * @param decimals - Anzahl Dezimalstellen (Standard: 2)
 * @returns Formatierter Prozentsatz (z.B. "15,00 %")
 */
export function fmtPercent(value: number, decimals: number = 2): string {
  if (isNaN(value)) return '';
  
  const percentage = value * 100;
  return `${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(percentage)} %`;
}

/**
 * Konvertiert einen deutschen Zahlenstring zurück zu einer Zahl
 * @param input - Deutscher Zahlenstring (z.B. "1.234,56")
 * @returns Parsed number oder NaN
 */
export function parseEUR(input: string): number {
  if (!input || typeof input !== 'string') return NaN;
  
  // Entferne Leerzeichen und €-Symbol
  const cleaned = input.trim().replace(/[€\s]/g, '');
  
  // Ersetze Komma durch Punkt für JavaScript-Parsing
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  
  return Number(normalized);
}
