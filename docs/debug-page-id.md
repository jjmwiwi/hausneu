# Debug-Page-ID-Anzeige

## Übersicht

Die Debug-Page-ID-Anzeige ist eine Entwicklerfunktion, die in allen Hauptseiten der Anwendung eine rote Page-ID anzeigt, um beim Debuggen sofort zu erkennen, welche Seite geladen ist.

## Funktionalität

### Was wird angezeigt?

- **Rotes Label** direkt rechts neben dem Haupttitel jeder Seite
- **Page-ID** als eindeutiger Identifier (z.B. `weg-einheiten`, `zaehler-uebersicht`)
- **Nur in Development-Modus** sichtbar (NODE_ENV !== 'production')

### Styling

```css
border: 1px solid red
color: red
border-radius: 4px
font-size: 0.75rem
padding: 0 4px
margin-left: 8px
background-color: rgba(255, 0, 0, 0.05)
font-weight: 500
```

## Implementierung

### 1. Zentrale Page-ID-Definition

Alle Page-IDs sind in `src/constants/pageIds.ts` definiert:

```typescript
export const PAGE_IDS = {
  WEG_STAMMDATEN: 'weg-stammdaten',
  WEG_EINHEITEN: 'weg-einheiten',
  KOSTENARTEN: 'kostenarten',
  ZAEHLERSTAND: 'zaehlerstand',
  ZAEHLER_UEBERSICHT: 'zaehler-uebersicht',
  ABLESUNGEN: 'ablesungen',
  // ... weitere IDs
};
```

### 2. DebugPageId-Komponente

Wiederverwendbare Komponente in `renderer/components/ui/DebugPageId.tsx`:

```typescript
export function DebugPageId({ id }: { id: string }) {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <span style={{ /* Styling */ }}>
      {id}
    </span>
  );
}
```

### 3. Integration in Seiten

Jede Hauptseite importiert und verwendet die Komponente:

```typescript
import { PAGE_IDS } from '../../src/constants/pageIds';
import DebugPageId from './ui/DebugPageId';

// Im JSX:
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  <h1>Seitentitel</h1>
  <DebugPageId id={PAGE_IDS.SEITEN_NAME} />
</div>
```

## Betroffene Seiten

### ✅ Bereits implementiert:

1. **StammdatenPage** - `weg-stammdaten`
2. **WEGEinheitenPage** - `weg-einheiten`
3. **KostenartenPage** - `kostenarten`
4. **ZaehlerstaendeOverview** - `zaehlerstand`
5. **AblesungenPage** - `ablesungen`
6. **ZaehlerUebersichtPage** - `zaehler-uebersicht`

### 🔄 Nächste Schritte:

- Weitere Hauptseiten identifizieren und integrieren
- Konsistente Platzierung in allen Seiten sicherstellen

## Tests

### Test-Suite

Alle Debug-Page-ID-Funktionalitäten werden durch `tests/debug-page-id.test.tsx` abgedeckt:

- ✅ Korrekte Page-ID-Anzeige in allen Seiten
- ✅ Korrekte Styling-Eigenschaften
- ✅ Production-Modus deaktiviert Debug-Anzeige
- ✅ Responsive Layout (flexbox mit gap)

### Test-Ausführung

```bash
npm test tests/debug-page-id.test.tsx
```

## Vorteile

1. **Schnelle Identifikation** der aktuellen Seite beim Debuggen
2. **Einheitliche Darstellung** in allen Hauptseiten
3. **Automatische Deaktivierung** in Production-Builds
4. **Wiederverwendbare Komponente** für einfache Wartung
5. **Zentrale Verwaltung** aller Page-IDs

## Wartung

### Neue Seite hinzufügen:

1. Page-ID in `src/constants/pageIds.ts` definieren
2. DebugPageId-Komponente in der Seite importieren
3. Neben dem Haupttitel platzieren
4. Test in `tests/debug-page-id.test.tsx` hinzufügen

### Page-ID ändern:

1. Wert in `src/constants/pageIds.ts` aktualisieren
2. Alle Verwendungen in Komponenten aktualisieren
3. Tests entsprechend anpassen

## Beispiel-Screenshot

```
┌─────────────────────────────────────────────────────────┐
│ WEG-Einheiten                    [weg-einheiten]        │
│                                                         │
│ + Neue Wohneinheit    Daten reparieren                 │
└─────────────────────────────────────────────────────────┘
```

Die rote Page-ID `[weg-einheiten]` wird direkt rechts neben dem Haupttitel angezeigt.
