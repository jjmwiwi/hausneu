# Manueller Test: Notiz-Persistierung bei neu angelegten Zählern

## 🎯 **Ziel**
Das Problem identifizieren, warum Notizen bei neu angelegten Zählern nach der Navigation verschwinden.

## 🧪 **Testvorschlag 1: Vollständiger Test**

### **Schritt 1: Neuen Zähler anlegen**
1. Öffne die Anwendung
2. Gehe zur **Zählerübersicht**
3. Klicke auf **"➕ Neuen Zähler anlegen"**
4. Fülle die Felder aus:
   - **Zählernummer**: `NEU001`
   - **Bezeichnung**: `ZählerNEU`
   - **Zählertyp**: `STROM`
   - **Einheit**: `Allgemein`
5. Klicke auf **"Speichern"**
6. **Erwartung**: Zähler wird angelegt und ist in der Übersicht sichtbar

### **Schritt 2: Notiz eingeben**
1. Gehe zur **Ablesungen-Seite**
2. Finde den Zähler `NEU001`
3. Gib in das **Notiz-Feld** ein: `AAA`
4. **Erwartung**: Notiz wird gespeichert und grüner Haken erscheint

### **Schritt 3: Konsole prüfen**
1. Öffne die **Browser-Konsole** (F12)
2. **Erwartung**: Du solltest detaillierte Logs sehen:
   ```
   [ZaehlerService] updateNote aufgerufen: zaehlerId=..., notiz="AAA"
   [Context] updateNote aufgerufen: wegId=..., zaehlerId=..., notiz="AAA"
   [ZaehlerService] Notiz für Zähler ... in IndexedDB aktualisiert: "AAA"
   ```

### **Schritt 4: Navigation testen**
1. Gehe zu einer **anderen Seite** (z.B. Stammdaten)
2. Gehe **zurück zur Zählerübersicht**
3. **Erwartung**: Die Notiz "AAA" sollte noch da sein

### **Schritt 5: Problem identifizieren**
**Tatsächliches Ergebnis**: Die Notiz "AAA" ist weg! 🚨

## 🔍 **Problem-Analyse**

### **Was funktioniert:**
- ✅ Zähler wird angelegt
- ✅ Notiz wird eingegeben
- ✅ `updateNote` wird aufgerufen
- ✅ Grüner Haken erscheint

### **Was nicht funktioniert:**
- ❌ Notiz verschwindet nach Navigation
- ❌ Daten werden nicht korrekt persistiert

## 🚨 **Identifizierte Ursachen**

### **1. Persistierungsproblem**
- Die Notiz wird im Context gespeichert, aber nicht in IndexedDB/localStorage
- Oder: Die Daten werden überschrieben

### **2. Timing-Problem**
- Es gibt eine Race Condition zwischen Speichern und Laden
- Die Daten werden geladen, bevor sie vollständig gespeichert sind

### **3. Datenquellen-Problem**
- `updateNote` speichert in IndexedDB
- Aber `list` lädt aus localStorage (oder umgekehrt)
- Die Synchronisation zwischen beiden Quellen funktioniert nicht

### **4. Duplikat-Behandlung**
- Die `mergeAndDeduplicate` Logik überschreibt die neuen Daten mit alten
- Der falsche `updatedAt` Timestamp wird verwendet

## 🧪 **Debug-Schritte**

### **Schritt 1: Console-Logs analysieren**
1. Führe den Test durch
2. Schaue in die Konsole
3. Suche nach:
   - `[ZaehlerService] updateNote aufgerufen`
   - `[ZaehlerService] Verifikation IndexedDB nach Speichern`
   - `[ZaehlerService] mergeAndDeduplicate: Starte mit ... Zählern`

### **Schritt 2: Datenquellen prüfen**
1. Öffne **DevTools → Application → IndexedDB**
2. Schaue in den `zaehler` Store
3. Prüfe, ob der Zähler mit der Notiz "AAA" dort ist

### **Schritt 3: localStorage prüfen**
1. Öffne **DevTools → Application → Local Storage**
2. Schaue nach `zaehler_data`
3. Prüfe, ob der Zähler mit der Notiz "AAA" dort ist

### **Schritt 4: Timestamps vergleichen**
1. Vergleiche die `updatedAt` Werte
2. Prüfe, ob der neuere Timestamp verwendet wird

## 🎯 **Erwartete Ergebnisse**

### **Wenn das Problem in der Persistierung liegt:**
- Console zeigt: `[ZaehlerService] FEHLER: Verifikation fehlgeschlagen!`
- IndexedDB/localStorage enthält die alten Daten

### **Wenn das Problem beim Laden liegt:**
- Console zeigt: `[ZaehlerService] Duplikat gefunden für ...`
- Die falschen Daten werden geladen

### **Wenn das Problem in der Synchronisation liegt:**
- Console zeigt unterschiedliche Daten in IndexedDB vs localStorage
- Die `mergeAndDeduplicate` Logik wählt die falschen Daten aus

## 🚀 **Nächste Schritte**

Nach der Identifikation des Problems:
1. **Konkrete Lösung implementieren**
2. **Tests schreiben** um das Problem zu verhindern
3. **Monitoring hinzufügen** um ähnliche Probleme früh zu erkennen

---

**Führe diesen Test durch und teile mir die Console-Logs mit!** 🕵️
