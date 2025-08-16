# Buchhaltung Utils - Format- & Mathe-Helper

Dieses Modul stellt einheitliche Formatierungs- und Mathematikhilfen für die Buchhaltung bereit, die deutsche Standards befolgen und korrekte Summen garantieren.

## Übersicht

### Datumsformatierung
- `fmtDate()` - Einzelnes Datum im Format DD.MM.YYYY
- `fmtRange()` - Datumsbereich im Format DD.MM.YYYY – DD.MM.YYYY

### Währungsformatierung
- `fmtEUR()` - Betrag im deutschen EUR-Format mit €-Symbol
- `fmtEURAmount()` - Betrag ohne Währungssymbol
- `parseEUR()` - Konvertierung von deutschen Zahlenstrings zurück zu Zahlen

### Mathematische Funktionen
- `round2()` - Banker's Rounding auf 2 Dezimalstellen
- `distributeRemainder()` - Faire Verteilung von Rest-Cents
- `validateSum()` - Überprüfung von Summen mit Toleranz

### Zusätzliche Hilfen
- `fmtPercent()` - Prozentsatz-Formatierung

## Verwendung

### Import

```typescript
import {
  fmtDate,
  fmtRange,
  fmtEUR,
  round2,
  distributeRemainder,
  validateSum
} from './buchhaltungUtils';
```

### Datumsformatierung

```typescript
// Einzelnes Datum
const datum = fmtDate('2024-01-15');        // "15.01.2024"
const datum2 = fmtDate(new Date());         // Aktuelles Datum

// Datumsbereich
const bereich = fmtRange('2024-01-01', '2024-01-31');
// Ergebnis: "01.01.2024 – 31.01.2024"

// Bei identischen Daten wird nur ein Datum zurückgegeben
const einzel = fmtRange('2024-01-15', '2024-01-15'); // "15.01.2024"
```

### Währungsformatierung

```typescript
// Mit Währungssymbol
const betrag = fmtEUR(1234.56);             // "1.234,56 €"
const negativ = fmtEUR(-1234.56);           // "-1.234,56 €"

// Ohne Währungssymbol
const nurZahl = fmtEURAmount(1234.56);      // "1.234,56"

// Parsing von deutschen Zahlenstrings
const zahl = parseEUR('1.234,56 €');        // 1234.56
const zahl2 = parseEUR('1.000,00');        // 1000.00
```

### Rundung und Summen

```typescript
// Banker's Rounding auf 2 Dezimalstellen
const gerundet = round2(33.333);            // 33.33
const gerundet2 = round2(33.335);           // 33.34

// Rest-Cent-Verteilung
const einzelbetraege = [33.33, 33.33, 33.33];
const gesamtbetrag = 100.00;
const finaleBetraege = distributeRemainder(gesamtbetrag, einzelbetraege);
// Ergebnis: [33.34, 33.33, 33.33] - Summe = 100.00

// Summenvalidierung
const istKorrekt = validateSum(100.00, finaleBetraege); // true
```

### Prozentsätze

```typescript
const prozent = fmtPercent(0.15);           // "15,00 %"
const prozent2 = fmtPercent(0.5, 1);       // "50,0 %"
```

## Anwendungsfälle

### 1. Buchhaltungsbelege

```typescript
// Beleg mit mehreren Positionen
const belegPositionen = [
  { beschreibung: 'Material', betrag: 33.333 },
  { beschreibung: 'Arbeitszeit', betrag: 33.333 },
  { beschreibung: 'Verwaltung', betrag: 33.333 }
];

const gesamtbetrag = 100.00;

// Runde alle Einzelbeträge
const gerundetePositionen = belegPositionen.map(pos => ({
  ...pos,
  betrag: round2(pos.betrag)
}));

// Verteile Rest-Cents fair
const finalePositionen = distributeRemainder(
  gesamtbetrag,
  gerundetePositionen.map(pos => pos.betrag)
);

// Überprüfe Summe
if (validateSum(gesamtbetrag, finalePositionen)) {
  console.log('Summe ist korrekt!');
}
```

### 2. UI-Anzeige

```typescript
// In React-Komponenten
const BuchhaltungsZeile = ({ datum, betrag, beschreibung }) => (
  <tr>
    <td>{fmtDate(datum)}</td>
    <td>{beschreibung}</td>
    <td className="text-right">{fmtEUR(betrag)}</td>
  </tr>
);

// Summenzeile
const SummenZeile = ({ positionen, gesamtbetrag }) => {
  const summe = positionen.reduce((acc, pos) => acc + pos.betrag, 0);
  const istKorrekt = validateSum(gesamtbetrag, [summe]);
  
  return (
    <tr className={istKorrekt ? 'table-success' : 'table-danger'}>
      <td colSpan={2}><strong>Gesamt</strong></td>
      <td className="text-right">
        <strong>{fmtEUR(gesamtbetrag)}</strong>
        {!istKorrekt && <span className="text-danger"> ⚠️</span>}
      </td>
    </tr>
  );
};
```

### 3. Datenimport/Export

```typescript
// CSV-Export mit deutschen Formaten
const exportiereCSV = (buchhaltungsdaten) => {
  const csvHeader = 'Datum,Beschreibung,Betrag\n';
  const csvZeilen = buchhaltungsdaten.map(datensatz => 
    `${fmtDate(datensatz.datum)},${datensatz.beschreibung},${fmtEURAmount(datensatz.betrag)}`
  ).join('\n');
  
  return csvHeader + csvZeilen;
};

// Datenimport mit Parsing
const importiereBetrag = (betragString) => {
  const betrag = parseEUR(betragString);
  if (isNaN(betrag)) {
    throw new Error(`Ungültiger Betrag: ${betragString}`);
  }
  return round2(betrag);
};
```

## Wichtige Hinweise

### Rundung
- `round2()` verwendet Banker's Rounding für faire Verteilung
- Alle Beträge werden auf 2 Dezimalstellen gerundet
- Rest-Cents werden fair auf die größten Nachkommarestwerte verteilt

### Formatierung
- Alle Funktionen folgen deutschen Standards (DD.MM.YYYY, 1.234,56 €)
- Führende Nullen werden bei Datumsformatierung hinzugefügt
- Währungsformatierung behält immer 2 Dezimalstellen

### Fehlerbehandlung
- Ungültige Eingaben werden zu leeren Strings oder 0 konvertiert
- `parseEUR()` gibt `NaN` für ungültige Eingaben zurück
- Alle Funktionen sind robust gegen `null`, `undefined` und ungültige Werte

### Performance
- Alle Funktionen sind optimiert für häufige Aufrufe
- Keine externen Abhängigkeiten außer Standard-JavaScript
- Geeignet für Echtzeit-Validierung in UI-Komponenten

## Tests

Das Modul wird durch umfassende Tests abgedeckt:

```bash
npm test -- buchhaltungUtils.test.ts
```

Die Tests decken alle Funktionen, Edge Cases und Integration-Szenarien ab.
