import {
  fmtDate,
  fmtRange,
  fmtEUR,
  fmtEURAmount,
  round2,
  distributeRemainder,
  validateSum,
  fmtPercent,
  parseEUR
} from '../renderer/utils/buchhaltungUtils';

describe('Buchhaltung Utils', () => {
  describe('fmtDate', () => {
    it('formatiert ein Date-Objekt korrekt', () => {
      const date = new Date('2024-01-15');
      expect(fmtDate(date)).toBe('15.01.2024');
    });

    it('formatiert einen ISO-String korrekt', () => {
      expect(fmtDate('2024-12-31')).toBe('31.12.2024');
    });

    it('fügt führende Nullen hinzu', () => {
      const date = new Date('2024-03-05');
      expect(fmtDate(date)).toBe('05.03.2024');
    });

    it('gibt leeren String für ungültige Daten zurück', () => {
      expect(fmtDate('invalid-date')).toBe('');
      expect(fmtDate(new Date('invalid'))).toBe('');
    });
  });

  describe('fmtRange', () => {
    it('formatiert einen Datumsbereich korrekt', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      expect(fmtRange(start, end)).toBe('01.01.2024 – 31.01.2024');
    });

    it('gibt nur ein Datum zurück wenn Start und Ende identisch sind', () => {
      const date = new Date('2024-01-15');
      expect(fmtRange(date, date)).toBe('15.01.2024');
    });

    it('gibt leeren String für ungültige Daten zurück', () => {
      expect(fmtRange('invalid', '2024-01-01')).toBe('');
      expect(fmtRange('2024-01-01', 'invalid')).toBe('');
    });
  });

  describe('fmtEUR', () => {
    it('formatiert positive Beträge korrekt', () => {
      expect(fmtEUR(1234.56)).toBe('1.234,56 €');
      expect(fmtEUR(0.01)).toBe('0,01 €');
      expect(fmtEUR(1000000)).toBe('1.000.000,00 €');
    });

    it('formatiert negative Beträge korrekt', () => {
      expect(fmtEUR(-1234.56)).toBe('-1.234,56 €');
      expect(fmtEUR(-0.01)).toBe('-0,01 €');
    });

    it('gibt leeren String für NaN zurück', () => {
      expect(fmtEUR(NaN)).toBe('');
    });

    it('behält immer 2 Dezimalstellen', () => {
      expect(fmtEUR(100)).toBe('100,00 €');
      expect(fmtEUR(100.1)).toBe('100,10 €');
      expect(fmtEUR(100.123)).toBe('100,12 €');
    });
  });

  describe('fmtEURAmount', () => {
    it('formatiert Beträge ohne Währungssymbol', () => {
      expect(fmtEURAmount(1234.56)).toBe('1.234,56');
      expect(fmtEURAmount(0.01)).toBe('0,01');
      expect(fmtEURAmount(1000000)).toBe('1.000.000,00');
    });

    it('gibt leeren String für NaN zurück', () => {
      expect(fmtEURAmount(NaN)).toBe('');
    });
  });

  describe('round2', () => {
    it('rundet auf 2 Dezimalstellen', () => {
      expect(round2(123.456)).toBe(123.46);
      expect(round2(123.454)).toBe(123.45);
      expect(round2(123.4)).toBe(123.40);
    });

    it('behandelt NaN korrekt', () => {
      expect(round2(NaN)).toBe(0);
    });

    it('behält bereits gerundete Zahlen bei', () => {
      expect(round2(123.45)).toBe(123.45);
      expect(round2(123.40)).toBe(123.40);
    });
  });

  describe('distributeRemainder', () => {
    it('verteilt positive Rest-Cents korrekt', () => {
      const total = 100.00;
      const parts = [33.33, 33.33, 33.33];
      const result = distributeRemainder(total, parts);
      
      expect(result).toEqual([33.34, 33.33, 33.33]);
      expect(validateSum(total, result)).toBe(true);
    });

    it('verteilt negative Rest-Cents korrekt', () => {
      const total = 100.00;
      const parts = [33.34, 33.34, 33.34];
      const result = distributeRemainder(total, parts);
      
      expect(result).toEqual([33.33, 33.33, 33.34]);
      expect(validateSum(total, result)).toBe(true);
    });

    it('behandelt leere Arrays', () => {
      expect(distributeRemainder(100, [])).toEqual([]);
    });

    it('verteilt Rest-Cents auf größte Nachkommarestwerte', () => {
      const total = 100.00;
      const parts = [25.123, 25.456, 25.789, 23.632];
      const result = distributeRemainder(total, parts);
      
      // Summe sollte dem Gesamtbetrag entsprechen
      expect(validateSum(total, result)).toBe(true);
      
      // Alle Werte sollten auf 2 Dezimalstellen gerundet sein
      result.forEach(part => {
        expect(part).toBe(round2(part));
      });
    });

    it('behandelt bereits korrekte Summen', () => {
      const total = 100.00;
      const parts = [25.00, 25.00, 50.00];
      const result = distributeRemainder(total, parts);
      
      expect(result).toEqual([25.00, 25.00, 50.00]);
      expect(validateSum(total, result)).toBe(true);
    });

    it('verteilt mehrere Rest-Cents korrekt', () => {
      const total = 100.00;
      const parts = [33.33, 33.33, 33.33];
      const result = distributeRemainder(total, parts);
      
      // 0.01 Rest sollte auf den ersten Wert verteilt werden
      expect(result[0]).toBe(33.34);
      expect(result[1]).toBe(33.33);
      expect(result[2]).toBe(33.33);
      expect(validateSum(total, result)).toBe(true);
    });
  });

  describe('validateSum', () => {
    it('validiert korrekte Summen', () => {
      expect(validateSum(100.00, [25.00, 25.00, 50.00])).toBe(true);
      expect(validateSum(0.00, [0.00, 0.00, 0.00])).toBe(true);
    });

    it('erkennt unkorrekte Summen', () => {
      expect(validateSum(100.00, [25.00, 25.00, 49.98])).toBe(false);
      expect(validateSum(100.00, [25.00, 25.00, 50.02])).toBe(false);
    });

    it('berücksichtigt Toleranz', () => {
      expect(validateSum(100.00, [25.00, 25.00, 50.01], 0.02)).toBe(true);
      expect(validateSum(100.00, [25.00, 25.00, 50.02], 0.01)).toBe(false);
    });
  });

  describe('fmtPercent', () => {
    it('formatiert Prozentsätze korrekt', () => {
      expect(fmtPercent(0.15)).toBe('15,00 %');
      expect(fmtPercent(0.5)).toBe('50,00 %');
      expect(fmtPercent(1.0)).toBe('100,00 %');
    });

    it('behandelt NaN korrekt', () => {
      expect(fmtPercent(NaN)).toBe('');
    });

    it('respektiert Dezimalstellen-Parameter', () => {
      expect(fmtPercent(0.1234, 1)).toBe('12,3 %');
      expect(fmtPercent(0.1234, 3)).toBe('12,340 %');
    });
  });

  describe('parseEUR', () => {
    it('parst deutsche Zahlenformate korrekt', () => {
      expect(parseEUR('1.234,56')).toBe(1234.56);
      expect(parseEUR('0,01')).toBe(0.01);
      expect(parseEUR('1.000.000,00')).toBe(1000000.00);
    });

    it('entfernt Währungssymbol und Leerzeichen', () => {
      expect(parseEUR('1.234,56 €')).toBe(1234.56);
      expect(parseEUR(' 1.234,56 € ')).toBe(1234.56);
    });

    it('gibt NaN für ungültige Eingaben zurück', () => {
      expect(parseEUR('')).toBe(NaN);
      expect(parseEUR('invalid')).toBe(NaN);
      expect(parseEUR(null as any)).toBe(NaN);
    });
  });

  describe('Integration Tests', () => {
    it('komplette Buchhaltungsberechnung mit Rundung', () => {
      // Simuliere eine Buchhaltungsberechnung
      const einzelbetraege = [33.333, 33.333, 33.333];
      const gesamtbetrag = 100.00;
      
      // Runde alle Einzelbeträge
      const gerundeteBetraege = einzelbetraege.map(round2);
      
      // Verteile Rest-Cents
      const finaleBetraege = distributeRemainder(gesamtbetrag, gerundeteBetraege);
      
      // Überprüfe, dass die Summe korrekt ist
      expect(validateSum(gesamtbetrag, finaleBetraege)).toBe(true);
      
      // Alle Beträge sollten im deutschen Format formatiert werden können
      finaleBetraege.forEach(betrag => {
        const formatted = fmtEUR(betrag);
        // Flexibleres Pattern für deutsche Währungsformatierung
        expect(formatted).toMatch(/^\d+(\.\d{3})*,\d{2} €$/);
      });
    });

    it('Datum und Betrag Formatierung zusammen', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const betrag = 1234.56;
      
      const datumsbereich = fmtRange(startDate, endDate);
      const formatierterBetrag = fmtEUR(betrag);
      
      expect(datumsbereich).toBe('01.01.2024 – 31.01.2024');
      expect(formatierterBetrag).toBe('1.234,56 €');
    });
  });
});
