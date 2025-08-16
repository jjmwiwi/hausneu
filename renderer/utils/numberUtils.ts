/**
 * Parst deutsche Zahlen (Komma als Dezimaltrennzeichen)
 * @param input - String oder Zahl
 * @returns Parsed number oder NaN
 */
export function parseDeNumber(input: string | number): number {
  const s = String(input).trim();
  if (!s) return NaN;
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Number(norm);
}

/**
 * Formatiert eine Zahl als deutschen String
 * @param num - Zahl
 * @param decimals - Anzahl Dezimalstellen
 * @returns Formatierter String
 */
export function formatDeNumber(num: number, decimals: number = 2): string {
  if (isNaN(num)) return '';
  return num.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
