# Kurzüberblick

- Immobilie: „WEG Stuttgarter Straße“
- Einheiten: 4 (Müller 1, Klee 2, Klee vermietet 3, Klee oben 4)
- Zähler & Start-/Endwerte 2024 existieren; dienen als Startwerte für 2025
- Muss können:
  - Stammdaten Einheiten (Name, Fläche, MEA, Kontakt, Personen, Mieter/Eigentümer, Ein-/Auszug)
  - Zähler je Einheit (CRUD) + Ablesungen (Jahresablesung)
  - Kostenkategorien + Belege (inkl. Verteilerschlüssel)
  - Heizungs-/Abrechnungseinstellungen
  - PDF „Ableseprotokoll“

Dateien:
- main.js: DB, IPC, PDF-Export
- preload.js: sichere Bridge (window.api)
- renderer/index.html|js: Startansicht
- renderer/ableseprotokoll.html|js: PDF Ansicht
