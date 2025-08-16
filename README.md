
# Hausverwaltung (Electron)

Minimal lauffähige Desktop-App mit:
- SQLite-Datenbank (`better-sqlite3`)
- Seed-Daten für **WEG Stuttgarter Straße** (Mieter + Zähler + Ablesungen 2024)
- Ansicht *Zählerstände* und PDF-Export **Ableseprotokoll**
- Installer-Konfiguration via **electron-builder** (NSIS, auswählbares Installationsverzeichnis)

## Entwicklung starten
```bash
npm install
npm start
```
## Windows-Installer bauen (auf Windows)
```bash
npm run dist
```
Danach finden Sie den Installer unter `dist/` (z. B. `Hausverwaltung Setup x.y.z.exe`).

> Hinweis: Ersetzen Sie `build/icon.ico` durch ein echtes Icon.
