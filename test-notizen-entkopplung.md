# Test: Notizen-Entkopplung zwischen Ablesungen und Zählerübersicht

## Test-Schritte:

### 1. Vorbereitung
- Öffne die Anwendung
- Gehe zur WEG "test-weg" oder einer anderen WEG
- Stelle sicher, dass der Zähler "Stroh" existiert

### 2. Test auf Ablesungen-Seite
- Gehe zur Seite "Ablesungen" für das aktuelle Jahr
- Suche den Zähler "Stroh"
- Trage im Notizen-Feld folgenden Text ein: `[TEST] Ablesungen-Notiz für Stroh - ${new Date().toISOString()}`
- Warte bis der Speicher-Status auf "✅" wechselt

### 3. Test auf Zählerübersicht-Seite
- Gehe zur Seite "Zählerübersicht"
- Suche den Zähler "Stroh"
- Prüfe das Notizen-Feld

### 4. Erwartetes Ergebnis
- **Ablesungen-Seite**: Notiz sollte den eingegebenen Text enthalten
- **Zählerübersicht-Seite**: Notiz sollte NICHT den eingegebenen Text enthalten (sollte leer oder den ursprünglichen Stammdaten-Text haben)

### 5. Aktuelles Problem (BUG)
- **Ablesungen-Seite**: Notiz wird korrekt gespeichert
- **Zählerübersicht-Seite**: Notiz wird fälschlicherweise auch hier angezeigt

## Ursache des Problems:
Die Notizen werden immer noch zwischen den beiden Ansichten übertragen, obwohl sie entkoppelt sein sollten.

## Ziel:
Das Notizen-Feld in der Ablesungen-Ansicht soll eigenständig sein und nicht automatisch den Text aus der Zählerübersicht übernehmen oder diesen überschreiben.

