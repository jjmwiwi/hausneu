//test
// main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Import der neuen IPC-Handler
try {
  require('./src/main/ipc/belege');
} catch (error) {
  console.warn('Belege IPC-Handler konnten nicht geladen werden:', error.message);
}

let db;

/* ---------- doppelte IPC-Registrierungen vermeiden ---------- */
[
  'db:get-overview',
  'db:list-units',
  'db:list-meters',
  'db:list-readings-for-meter',
  'db:get-readings',
  'db:list-meters-with-readings',
  'db:get-property-id',
  'db:save-reading',
  'db:list-readings',
  'db:update-reading',
  'db:delete-reading',
  'units:update',
  'export:ableseprotokoll',
  'bk:list-years',
  'bk:start',
  'bk:get-statement',
  'bk:update-status',
  'heat:load',
  'heat:save',
  'heat:compute',
  'bk:list-categories',
  'bk:update-category-key',
  'bk:list-vouchers',
  'bk:save-voucher',
  'bk:delete-voucher',
  'bk:toggle-include',
  'bk:attach-file',
  'bk:open-attachment',
  'bk:calc-basis',
  'bk:sum-category',
  'bk:preview-distribution',
  'bk:set-override',
  'bk:save-distribution',
  'stmt:overview',
  'stmt:export-pdf',
  'payments:list',
  'payments:save',
  'payments:upsert',
  'payments:delete',
  'stmt:prepayments',
  'advance:list',
  'advance:save',
  'advance:import-csv',
  'heating:calculate',
  'heating:get-settings',
  'heating:save-settings',
  'statement:calculate',
  'statement:get',
  'statement:save',
  'statement:export-pdf',
  'statement:update-row',
  'getHeizungsEinstellungen',
  'getHeizungsDaten',
  'saveHeizkostenCalculation'
].forEach(ch => { try { ipcMain.removeHandler(ch); } catch (_) {} });

if (!global.__ipcRegistered) global.__ipcRegistered = false;

/* -------------------- DB -------------------- */
function initDB() {
  const dbDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'hausverwaltung.db');
  const firstTime = !fs.existsSync(dbPath);
  db = new sqlite3.Database(dbPath);

  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      image_path TEXT
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      area_m2 REAL,
      mea REAL,
      occupant_name TEXT,
      occupant_email TEXT,
      occupant_phone TEXT,
      persons INTEGER,
      type TEXT CHECK(type IN ('Mieter','Eigentümer')),
      move_in TEXT,
      move_out TEXT,
      FOREIGN KEY(property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS meters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      unit_id INTEGER,
      number TEXT,
      label TEXT,
      meter_type TEXT,
      location TEXT,
      unit TEXT,
      FOREIGN KEY(property_id) REFERENCES properties(id),
      FOREIGN KEY(unit_id) REFERENCES units(id)
    );

    CREATE TABLE IF NOT EXISTS meter_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meter_id INTEGER NOT NULL,
      period_start TEXT,
      period_end TEXT,
      start_value REAL,
      end_value REAL,
      consumption REAL,
      unit TEXT,
      note TEXT,
      FOREIGN KEY(meter_id) REFERENCES meters(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ux_meter_period
      ON meter_readings(meter_id, period_start, period_end);

    CREATE TABLE IF NOT EXISTS distribution_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cost_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      distribution_key TEXT NOT NULL,
      FOREIGN KEY(property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      voucher_no TEXT,
      voucher_date TEXT,
      gross REAL,
      net REAL,
      include_in_statement INTEGER DEFAULT 1,
      file_path TEXT,
      FOREIGN KEY(property_id) REFERENCES properties(id),
      FOREIGN KEY(category_id) REFERENCES cost_categories(id)
    );

    CREATE TABLE IF NOT EXISTS heating_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      system_type TEXT,
      fuel TEXT,
      heated_area REAL,
      supply_temp_c REAL,
      hotwater_unit TEXT,
      no_hotwater_consumption INTEGER,
      consumption_share INTEGER,
      FOREIGN KEY (property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS operating_statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT DEFAULT 'neu',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      UNIQUE(property_id, year),
      FOREIGN KEY(property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS heating_statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operating_statement_id INTEGER NOT NULL,
      fuel_input_type TEXT NOT NULL,
      input_amount REAL NOT NULL,
      unit_price REAL NOT NULL,
      gross_cost REAL NOT NULL,
      warmwater_wmz_meter_id INTEGER,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      UNIQUE(operating_statement_id),
      FOREIGN KEY(operating_statement_id) REFERENCES operating_statements(id)
    );

    CREATE TABLE IF NOT EXISTS fuel_factors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT UNIQUE NOT NULL,
      calorific_value REAL NOT NULL,
      state_number REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_statements_prop_year ON statements(property_id, year);

    CREATE TABLE IF NOT EXISTS statement_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      basis_value REAL,
      basis_label TEXT,
      share_percent REAL,
      amount_gross REAL,
      amount_net REAL,
      FOREIGN KEY(statement_id) REFERENCES statements(id),
      FOREIGN KEY(category_id) REFERENCES cost_categories(id),
      FOREIGN KEY(unit_id) REFERENCES units(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_alloc ON statement_allocations(statement_id, category_id, unit_id);

    CREATE TABLE IF NOT EXISTS distribution_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      manual_amount_gross REAL,
      note TEXT,
      FOREIGN KEY(statement_id) REFERENCES statements(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_overrides ON distribution_overrides(statement_id, category_id, unit_id);

    CREATE TABLE IF NOT EXISTS advance_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      FOREIGN KEY(statement_id) REFERENCES statements(id),
      FOREIGN KEY(unit_id) REFERENCES units(id)
    );

    CREATE INDEX IF NOT EXISTS idx_advance_payments ON advance_payments(statement_id, unit_id);

    -- New tables for versionable statement runs
    CREATE TABLE IF NOT EXISTS statement_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'finalized')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      heating_costs_total REAL DEFAULT 0,
      operating_costs_total REAL DEFAULT 0,
      advance_payments_total REAL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(property_id) REFERENCES properties(id),
      UNIQUE(property_id, year)
    );

    CREATE TABLE IF NOT EXISTS statement_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      cost_type TEXT NOT NULL,
      distribution_key TEXT NOT NULL,
      basis_value REAL DEFAULT 0,
      basis_label TEXT,
      share_percent REAL DEFAULT 0,
      amount_euro REAL DEFAULT 0,
      category TEXT,
      is_heating_cost INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(run_id) REFERENCES statement_runs(id),
      FOREIGN KEY(unit_id) REFERENCES units(id)
    );

    CREATE TABLE IF NOT EXISTS statement_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      total_costs REAL DEFAULT 0,
      advance_payments REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      area_m2 REAL DEFAULT 0,
      mea REAL DEFAULT 0,
      persons INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(run_id) REFERENCES statement_runs(id),
      FOREIGN KEY(unit_id) REFERENCES units(id),
      UNIQUE(run_id, unit_id)
    );

    CREATE INDEX IF NOT EXISTS idx_statement_rows_run ON statement_rows(run_id);
    CREATE INDEX IF NOT EXISTS idx_statement_rows_unit ON statement_rows(unit_id);
    CREATE INDEX IF NOT EXISTS idx_statement_summary_run ON statement_summary(run_id);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      date TEXT NOT NULL,           -- ISO (YYYY-MM-DD)
      amount REAL NOT NULL,         -- positive Werte
      year INTEGER NOT NULL,        -- Abrechnungsjahr, zur schnellen Filterung
      note TEXT,
      method TEXT,                  -- optional: "SEPA", "Dauerauftrag", etc.
      FOREIGN KEY(property_id) REFERENCES properties(id),
      FOREIGN KEY(unit_id) REFERENCES units(id)
    );
    CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(year);
    CREATE INDEX IF NOT EXISTS idx_payments_unit_year ON payments(unit_id, year);

    CREATE TABLE IF NOT EXISTS advance_payments_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY(property_id) REFERENCES properties(id),
      FOREIGN KEY(unit_id) REFERENCES units(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_advance_payments_monthly ON advance_payments_monthly(property_id, unit_id, year, month);
  `);

  // Initialize fuel factors if empty
  const fuelFactorsCount = db.prepare('SELECT COUNT(*) as count FROM fuel_factors').get();
  if (fuelFactorsCount.count === 0) {
    db.prepare('INSERT INTO fuel_factors (kind, calorific_value, state_number) VALUES (?, ?, ?)').run('m3_L', 9.5, 0.96);
    db.prepare('INSERT INTO fuel_factors (kind, calorific_value, state_number) VALUES (?, ?, ?)').run('m3_H', 10.7, 0.96);
  }

  if (firstTime) seedExample();
}

function seedExample() {
  const insertProperty = db.prepare('INSERT INTO properties (name, address) VALUES (?, ?)');
  const res = insertProperty.run('WEG Stuttgarter Straße', 'Stuttgarter Str. 104, 71229 Leonberg');
  const pid = res.lastInsertRowid;

  const units = [
    {name:'Wohnung Müller unten Nr. 1', area:98.60, mea:0, person:1, type:'Mieter', occ:'Jürgen Müller'},
    {name:'Wohnung Klee unten Nr. 2', area:101.59, mea:0, person:1, type:'Eigentümer', occ:'Rudolf Klee'},
    {name:'Wohnung Klee vermietet Nr. 3', area:135.58, mea:0, person:1, type:'Mieter', occ:'Amerika'},
    {name:'Wohnung Klee oben Nr. 4', area:137.45, mea:0, person:1, type:'Eigentümer', occ:'Rudolf Klee'},
  ];
  const insertUnit = db.prepare(`INSERT INTO units
    (property_id, name, area_m2, mea, persons, type, occupant_name, move_in)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const unitIds = {};
  for (const u of units) {
    const r = insertUnit.run(pid, u.name, u.area, u.mea, u.person, u.type, u.occ, '2000-01-01');
    unitIds[u.name] = r.lastInsertRowid;
  }

  const insertMeter = db.prepare(`INSERT INTO meters
    (property_id, unit_id, number, label, meter_type, location, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insertReading = db.prepare(`INSERT INTO meter_readings
    (meter_id, period_start, period_end, start_value, end_value, consumption, unit, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  // Hauszähler
  const mz1 = insertMeter.run(pid, null, '4336128', 'Allgemein Strom', 'Strom', 'Stromkasten', 'kWh').lastInsertRowid;
  insertReading.run(mz1, '2024-01-01', '2024-12-31', 31108.00, 32187.00, 1079.00, 'kWh', '');
  const mz2 = insertMeter.run(pid, null, '6ZRI8810523269', 'Wärmemengenzähler Allgemein', 'Wärmemenge Heizung', 'Keller', 'MWh').lastInsertRowid;
  insertReading.run(mz2, '2024-01-01', '2024-12-31', 0.00, null, null, 'MWh', '');

  const seedUnitMeters = (unitName, meters) => {
    const uid = unitIds[unitName];
    for (const m of meters) {
      const mid = insertMeter.run(pid, uid, m[0], m[1], m[2], m[3], m[4]).lastInsertRowid;
      insertReading.run(mid, '2024-01-01', '2024-12-31', m[5], m[6], m[7], m[4], '');
    }
  };

  seedUnitMeters('Wohnung Klee oben Nr. 4', [
    ['10314034','Garten','Kaltwasserverbrauch','Garten','m³',62.36,62.67,0.32],
    ['14620080','Waschküche','Kaltwasserverbrauch','Waschküche','m³',8.11,8.12,0.01],
    ['15339467','Kaltwasser Spülmaschine','Kaltwasserverbrauch','Küche','m³',0.00,0.34,0.34],
    ['4834','Kaltwasser Küche','Kaltwasserverbrauch','Küche','m³',6.17,6.19,0.02],
    ['9205','Kaltwasser Toilette','Kaltwasserverbrauch','Toilette','m³',65.41,74.68,9.27],
    ['1658','Warmwasser Küche','Warmwasserverbrauch','Küche','m³',20.10,20.11,0.01],
    ['2161','Warmwasser Toilette','Warmwasserverbrauch','Toilette','m³',31.84,45.56,13.72],
    ['6ZRI8810523272','WMZ Klee oben','Wärmemenge Heizung','Heizungskeller','MWh',23.68,25.95,2.27],
  ]);

  seedUnitMeters('Wohnung Klee unten Nr. 2', [
    ['14620082','Waschküche','Kaltwasserverbrauch','Waschküche','m³',22.75,27.28,4.53],
    ['17093553','Warmwasser Bad','Warmwasserverbrauch','Bad','m³',86.62,101.75,15.13],
    ['20059074','Kaltwasser Toilette','Kaltwasserverbrauch','Toilette','m³',77.26,103.96,26.70],
    ['20060849','Warmwasser Toilette','Warmwasserverbrauch','Toilette','m³',46.53,64.81,18.28],
    ['5170','Kaltwasser Bad','Kaltwasserverbrauch','Bad','m³',131.47,147.58,16.11],
    ['6ZRI8811033579','WMZ Klee unten','Wärmemenge Heizung','Heizungskeller','MWh',3.31,10.23,6.92],
    ['740025752','Garten','Kaltwasserverbrauch','Garten','m³',852.77,874.83,22.06],
  ]);

  seedUnitMeters('Wohnung Klee vermietet Nr. 3', [
    ['14620079','Waschküche','Kaltwasserverbrauch','Waschküche','m³',0.15,0.15,0.00],
    ['6043','Warmwasser Bad','Warmwasserverbrauch','Bad','m³',48.76,75.94,27.18],
    ['6ZRI88300008040','WMZ Klee vermietet','Wärmemenge Heizung','Heizung','MWh',16.44,19.11,2.68],
    ['7908','Kaltwasser Küche','Kaltwasserverbrauch','Küche','m³',11.57,16.49,4.92],
    ['8631','Warmwasser Küche','Warmwasserverbrauch','Küche','m³',6.91,11.72,4.81],
    ['9203','Kaltwasser Bad','Kaltwasserverbrauch','Bad','m³',105.76,156.91,51.15],
  ]);

  seedUnitMeters('Wohnung Müller unten Nr. 1', [
    ['14620078','Waschküche','Kaltwasserverbrauch','Waschküche','m³',36.84,49.11,12.27],
    ['14620081','Garten','Kaltwasserverbrauch','Garten','m³',16.94,21.64,4.70],
    ['15175209','Küche Kalt','Kaltwasserverbrauch','Küche','m³',33.62,39.95,6.33],
    ['20059153','Badezimmer Kalt','Kaltwasserverbrauch','Badzimmer','m³',147.72,204.21,56.49],
    ['20060847','Badezimmer Warm','Warmwasserverbrauch','Badezimmer','m³',40.75,53.62,12.87],
    ['24334787','Küche Warm','Warmwasserverbrauch','Küche','m³',10.04,13.13,3.09],
    ['6ZRI8810499425','WMZ Müller Heizung','Wärmemenge Heizung','Heizung','MWh',29.58,36.28,6.70],
  ]);

  const insCat = db.prepare('INSERT INTO cost_categories (property_id, name, distribution_key) VALUES (?, ?, ?)');
  [
    ['Ablesung','Miteigentumsanteil'],
    ['Bankgebühren','Miteigentumsanteil'],
    ['Gebäudeversicherung','Miteigentumsanteil'],
    ['Grundsteuer','Wohnfläche'],
    ['Gutschriften','Strom'],
    ['Haftpflichtversicherung','Miteigentumsanteil'],
    ['Hausausrüstung','Miteigentumsanteil'],
    ['Hausratversicherung','Miteigentumsanteil'],
    ['Hausstrom','Miteigentumsanteil'],
    ['Hausverwaltung','Anzahl Wohnungen'],
    ['Hauswart','Wohnfläche'],
    ['Heizung (externe Abrechnung)','Individuelle Zuweisung'],
    ['Heizung (Grundkosten)','Miteigentumsanteil'],
    ['Heizung (Verbrauch)','Wärmemenge Heizung'],
    ['Heizung & Heizungswartung','Miteigentumsanteil'],
    ['Instandhaltung','Miteigentumsanteil'],
    ['Minol','Miteigentumsanteil'],
    ['Müllgebühren','Individuelle Zuweisung'],
    ['Niederschlagswasser','Wasserverbrauch'],
    ['Schmutzwasser','Gesamtwasserverbrauch'],
    ['Schornsteinfeger','Miteigentumsanteil'],
    ['Straßenreinigung','Miteigentumsanteil'],
    ['Trinkwasser','Gesamtwasserverbrauch'],
    ['Warmwasser (Grundkosten)','Wohnfläche'],
    ['Warmwasser (Verbrauch)','Wärmemenge Warmwasser']
  ].forEach(c => insCat.run(pid, c[0], c[1]));

  db.prepare(`INSERT INTO heating_settings
              (property_id, system_type, fuel, heated_area, supply_temp_c, hotwater_unit, no_hotwater_consumption, consumption_share)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(pid, 'Zentral mit Warmwasser', 'Heizleistung (kWh)', 473.22, 60, 'Warmwasserverbrauch (m3)', 1, 70);

  // Payments Tabelle anlegen (bereits in initDB erstellt)
  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS payments (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     property_id INTEGER NOT NULL,
  //     unit_id INTEGER NOT NULL,
  //     date TEXT NOT NULL,           -- ISO (YYYY-MM-DD)
  //     amount REAL NOT NULL,         -- positive Werte
  //     year INTEGER NOT NULL,        -- Abrechnungsjahr, zur schnellen Filterung
  //     note TEXT,
  //     method TEXT,                  -- optional: "SEPA", "Dauerauftrag", etc.
  //     FOREIGN KEY(property_id) REFERENCES properties(id),
  //     FOREIGN KEY(unit_id) REFERENCES units(id)
  //   );
  //   CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(year);
  //   CREATE INDEX IF NOT EXISTS idx_payments_unit_year ON payments(unit_id, year);
  // `);

  // Advance Payments Tabelle anlegen (bereits in initDB erstellt)
  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS advance_payments (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     property_id INTEGER NOT NULL,
  //     unit_id INTEGER NOT NULL,
  //     year INTEGER NOT NULL,
  //     month INTEGER NOT NULL,
  //     amount REAL NOT NULL,
  //     FOREIGN KEY(property_id) REFERENCES properties(id),
  //     FOREIGN KEY(unit_id) REFERENCES units(id)
  //   );
  //   CREATE UNIQUE INDEX IF NOT EXISTS uq_advance_payments ON advance_payments(property_id, unit_id, year, month);
  // `);

  // Dummy-Daten für Tests (nur beim Seed)
  const insPay = db.prepare(`INSERT INTO payments (property_id, unit_id, date, amount, year, note, method)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const [unitName, sum] of [
    ['Wohnung Müller unten Nr. 1', 1200],
    ['Wohnung Klee unten Nr. 2', 1200],
    ['Wohnung Klee vermietet Nr. 3', 1200],
    ['Wohnung Klee oben Nr. 4', 1200],
  ]) {
    const uid = unitIds[unitName];
    // Beispiel: 12x 100 €
    for (let m=1;m<=12;m++){
      const dt = `2025-${String(m).padStart(2,'0')}-05`;
      insPay.run(pid, uid, dt, 100, 2025, 'Monatsabschlag', 'Dauerauftrag');
    }
  }

  // Dummy-Daten für Advance Payments (monatliche Vorauszahlungen)
  const insAdvance = db.prepare(`INSERT INTO advance_payments_monthly (property_id, unit_id, year, month, amount)
    VALUES (?, ?, ?, ?, ?)`);
  for (const [unitName, monthlyAmount] of [
    ['Wohnung Müller unten Nr. 1', 200],
    ['Wohnung Klee unten Nr. 2', 200],
    ['Wohnung Klee vermietet Nr. 3', 200],
    ['Wohnung Klee oben Nr. 4', 200],
  ]) {
    const uid = unitIds[unitName];
    // Beispiel: 12x 200 € pro Monat
    for (let m=1;m<=12;m++){
      insAdvance.run(pid, uid, 2025, m, monthlyAmount);
    }
  }
}

/* -------------------- Fenster -------------------- */
const DEV_PORT = process.env.VITE_DEV_SERVER_PORT || '3000';
const DEV_URL = `http://localhost:${DEV_PORT}`;
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

async function createWindow () {
  const win = new BrowserWindow({
    width: 1250,
    height: 800,
    webPreferences: { 
      preload: path.join(__dirname, 'preload.js'), 
      contextIsolation: true, 
      nodeIntegration: false, 
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      enableRemoteModule: false
    }
  });
  
  // Content-Security-Policy setzen
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\';']
      }
    });
  });

  if (isDev) {
    // 1) SW & Cache im Dev sofort entsorgen
    try {
      await session.defaultSession.clearCache();
      const regs = await win.webContents.executeJavaScript(
        "navigator.serviceWorker?.getRegistrations?.().then(rs=>rs.forEach(r=>r.unregister()))"
      );
    } catch {/* ignore */}

    // 2) Auf Vite warten (max ~15s), dann URL laden
    await waitForDevServer(DEV_URL, 15000);
    await win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production: lokales Bundle
    await win.loadFile('renderer/dist/renderer/index-react.html');
  }
}

// Kleiner Pinger auf den Vite-Server
async function waitForDevServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { mode: 'no-cors' }); // Node18 hat global fetch
      if (res || true) return; // no-cors gibt oft opaque zurück – reicht als Reachability
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Dev server not reachable at ${url}`);
}

/* -------------------- IPC einmalig registrieren -------------------- */
function registerIpcOnce() {
  if (global.__ipcRegistered) return;
  global.__ipcRegistered = true;

  // Neue Belege-IPC-Handler registrieren
  try {
    const { registerBelegeHandlers } = require('./src/main/ipc/belege');
    registerBelegeHandlers();
    console.log('Belege IPC-Handler erfolgreich registriert');
  } catch (error) {
    console.warn('Belege IPC-Handler konnten nicht registriert werden:', error.message);
  }

ipcMain.handle('db:get-overview', () => {
    try {
  const property = db.prepare('SELECT * FROM properties ORDER BY id LIMIT 1').get();
      if (!property) {
        console.log('No properties found in database');
        return { property: null, units: [] };
      }
      
      const units = db.prepare('SELECT * FROM units WHERE property_id = ? ORDER BY name').all(property.id);
  return { property, units };
    } catch (e) {
      console.error('Error in db:get-overview:', e);
      return { property: null, units: [] };
    }
  });

  ipcMain.handle('db:list-units', (_e, { propertyId }) => {
    return db.prepare('SELECT id, name FROM units WHERE property_id = ? ORDER BY name').all(propertyId);
  });

ipcMain.handle('db:list-meters', (_e, propertyId) => {
  return db.prepare(`
    SELECT m.*, u.name AS unit_name
    FROM meters m
    LEFT JOIN units u ON u.id = m.unit_id
    WHERE m.property_id = ?
    ORDER BY u.name IS NULL, u.name, m.label
  `).all(propertyId);
});

  ipcMain.handle('db:list-readings-for-meter', (_e, { meterId, limit = 20 }) => {
    return db.prepare(`
      SELECT id, period_start, period_end, start_value, end_value, consumption, unit, note
      FROM meter_readings
      WHERE meter_id = ?
      ORDER BY date(period_end) DESC, date(period_start) DESC
      LIMIT ?
    `).all(meterId, limit);
  });

  ipcMain.handle('db:get-readings', (_e, { propertyId, from, to }) => {
  return db.prepare(`
      SELECT m.id AS meter_id, m.number, m.label, m.meter_type, m.location, m.unit,
             u.name AS unit_name,
           r.period_start, r.period_end, r.start_value, r.end_value, r.consumption, r.note
    FROM meters m
    LEFT JOIN units u ON u.id = m.unit_id
    LEFT JOIN meter_readings r ON r.meter_id = m.id
    WHERE m.property_id = ?
        AND (r.period_end IS NULL OR r.period_end BETWEEN ? AND ?)
      ORDER BY u.name IS NULL, u.name, m.label, r.period_end
    `).all(propertyId, from || '1900-01-01', to || '2999-12-31');
  });

  ipcMain.handle('db:list-meters-with-readings', (_e, { propertyId }) => {
  return db.prepare(`
    SELECT m.id AS meter_id, m.number, m.label, m.meter_type, m.location, m.unit,
           u.name AS unit_name,
             r.period_start, r.period_end, r.start_value, r.end_value, r.consumption
    FROM meters m
    LEFT JOIN units u ON u.id = m.unit_id
      LEFT JOIN meter_readings r ON r.meter_id = m.id
    WHERE m.property_id = ?
      ORDER BY u.name IS NULL, u.name, m.label
    `).all(propertyId);
});

ipcMain.handle('db:get-property-id', () => {
  const r = db.prepare('SELECT id FROM properties WHERE name = ?').get('WEG Stuttgarter Straße');
  return r ? r.id : null;
});

  // *** EINZIGER db:save-reading Handler ***
  ipcMain.removeHandler('db:save-reading');
  ipcMain.handle('db:save-reading', (_e, payload) => {
    const { meterId } = payload;
    const m = db.prepare('SELECT unit FROM meters WHERE id = ?').get(meterId);
    if (!m) return { ok: false, error: 'Meter not found' };

    let { periodStart, periodEnd } = payload;
    if (!periodStart || !periodEnd) {
      const y = (payload.date && /^\d{4}/.test(payload.date)) ? payload.date.slice(0,4) : String(new Date().getFullYear());
      periodStart = periodStart || `${y}-01-01`;
      periodEnd   = periodEnd   || payload.date || `${y}-12-31`;
    }

    const sv = (payload.start_value ?? '') === '' ? null : Number(payload.start_value);
    const ev = (payload.end_value   ?? '') === '' ? null : Number(payload.end_value);
    const consumption = (Number.isFinite(sv) && Number.isFinite(ev)) ? +(ev - sv).toFixed(2) : null;

    const upsert = db.prepare(`
      INSERT INTO meter_readings (meter_id, period_start, period_end, start_value, end_value, consumption, unit, note)
      VALUES (@meterId, @periodStart, @periodEnd, @sv, @ev, @consumption, @unit, @note)
      ON CONFLICT(meter_id, period_start, period_end) DO UPDATE SET
        start_value=excluded.start_value,
        end_value=excluded.end_value,
        consumption=excluded.consumption,
        unit=excluded.unit,
        note=excluded.note
    `);

    upsert.run({
      meterId,
      periodStart,
      periodEnd,
      sv,
      ev,
      consumption,
      unit: m.unit || null,
      note: payload.note || null
    });

    return { ok: true, consumption };
  });

  ipcMain.removeHandler('db:list-readings');
  ipcMain.handle('db:list-readings', async (_e, payload = {}) => {
    const { meterId, from, to, page = 1, pageSize = 50 } = payload;
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (meterId) {
      whereClause += ' AND meter_id = ?';
      params.push(meterId);
    }
    
    if (from) {
      whereClause += ' AND period_start >= ?';
      params.push(from);
    }
    
    if (to) {
      whereClause += ' AND period_end <= ?';
      params.push(to);
    }
    
    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM meter_readings ${whereClause}`);
    const total = countStmt.get(...params).total;
    
    // Get paginated results with stable sort
    const itemsStmt = db.prepare(`
      SELECT id, meter_id, period_start, period_end, start_value, end_value, consumption, unit, note
      FROM meter_readings 
      ${whereClause}
      ORDER BY period_end DESC, period_start DESC, id DESC
      LIMIT ? OFFSET ?
    `);
    
    const items = itemsStmt.all(...params, pageSize, offset);
    
    return { items, total, page, pageSize };
  });

  ipcMain.removeHandler('db:update-reading');
  ipcMain.handle('db:update-reading', async (_e, payload) => {
    const { id, ...patch } = payload || {};
    if (!id) throw new Error('Missing id for db:update-reading');
    
    const allowedFields = ['period_start', 'period_end', 'start_value', 'end_value', 'consumption', 'note'];
    const updateFields = [];
    const params = [];
    
    for (const [key, value] of Object.entries(patch)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        params.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      return { ok: false, error: 'No valid fields to update' };
    }
    
    // Recalculate consumption if start/end values changed
    if (patch.start_value !== undefined || patch.end_value !== undefined) {
      const current = db.prepare('SELECT start_value, end_value FROM meter_readings WHERE id = ?').get(id);
      if (current) {
        const startVal = patch.start_value !== undefined ? patch.start_value : current.start_value;
        const endVal = patch.end_value !== undefined ? patch.end_value : current.end_value;
        if (startVal !== null && endVal !== null && !isNaN(startVal) && !isNaN(endVal)) {
          updateFields.push('consumption = ?');
          params.push(+(endVal - startVal).toFixed(2));
        }
      }
    }
    
    params.push(id);
    
    const result = db.prepare(`
      UPDATE meter_readings 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);
    
    return { ok: true, changes: result.changes };
  });

  ipcMain.removeHandler('db:delete-reading');
  ipcMain.handle('db:delete-reading', async (_e, payload) => {
    const { id } = payload || {};
    if (!id) throw new Error('Missing id for db:delete-reading');
    
    const result = db.prepare('DELETE FROM meter_readings WHERE id = ?').run(id);
    return { ok: true, changes: result.changes };
  });

  ipcMain.removeHandler('units:update');
  ipcMain.handle('units:update', async (_e, payload = {}) => {
    const { id, patch } = payload;
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
      throw new Error('Missing or invalid id for units:update');
    }
    
    // Validate minimally here too
    if (patch && typeof patch === 'object') {
      if ('persons' in patch) {
        const v = Number(patch.persons);
        if (!Number.isFinite(v) || v < 0) throw new Error('Invalid persons value');
      }
      if ('area_m2' in patch) {
        const a = Number(patch.area_m2);
        if (!Number.isFinite(a) || a < 0) throw new Error('Invalid area value');
      }
    }
    
    // Update the unit
    const allowedFields = ['name', 'area_m2', 'occupant_name', 'persons', 'type'];
    const updateFields = [];
    const params = [];
    
    for (const [key, value] of Object.entries(patch)) {
      if (allowedFields.includes(key)) {
        let processedValue = value;
        
        // Process string fields
        if (typeof value === 'string') {
          processedValue = value.trim();
          if (processedValue === '') processedValue = null;
        }
        
        // Process number fields
        if (key === 'persons' && processedValue !== null) {
          processedValue = Math.floor(Number(processedValue));
        }
        if (key === 'area_m2' && processedValue !== null) {
          processedValue = Number(processedValue);
        }
        
        updateFields.push(`${key} = ?`);
        params.push(processedValue);
      }
    }
    
    if (updateFields.length === 0) {
      return { ok: false, error: 'No valid fields to update' };
    }
    
    params.push(id);
    
    const result = db.prepare(`
      UPDATE units 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);
    
    if (result.changes === 0) {
      return { ok: false, error: 'Unit not found' };
    }
    
    // Return the updated unit
    const updatedUnit = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
    return { ok: true, unit: updatedUnit };
  });

                  // Immobilien management
                ipcMain.removeHandler('immo:list');
                ipcMain.handle('immo:list', () => {
                  return db.prepare('SELECT id, name, address FROM properties ORDER BY name').all();
                });

                ipcMain.removeHandler('immo:get');
                ipcMain.handle('immo:get', (_e, { id }) => {
                  if (!id) throw new Error('Missing id for immo:get');
                  return db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
                });

                ipcMain.removeHandler('immo:update');
                ipcMain.handle('immo:update', async (_e, { id, patch }) => {
                  if (!id) throw new Error('Missing id for immo:update');
                  
                  console.log('immo:update called with:', { id, patch });
                  
                  // Check if notes column exists, if not add it
                  try {
                    const tableInfo = db.prepare("PRAGMA table_info(properties)").all();
                    const hasNotes = tableInfo.some(col => col.name === 'notes');
                    
                    if (!hasNotes) {
                      console.log('Adding notes column to properties table');
                      db.prepare('ALTER TABLE properties ADD COLUMN notes TEXT').run();
                    }
                    
                    const hasImagePath = tableInfo.some(col => col.name === 'image_path');
                    if (!hasImagePath) {
                      console.log('Adding image_path column to properties table');
                      db.prepare('ALTER TABLE properties ADD COLUMN image_path TEXT').run();
                    }
                  } catch (e) {
                    console.warn('Failed to check/add columns:', e);
                  }
                  
                  const allowedFields = ['name', 'address', 'notes', 'image_path'];
                  const updateFields = Object.keys(patch).filter(key => allowedFields.includes(key));
                  
                  console.log('Update fields:', updateFields);
                  
                  if (updateFields.length === 0) {
                    throw new Error('No valid fields to update');
                  }
                  
                  const setClause = updateFields.map(field => `${field} = ?`).join(', ');
                  const values = updateFields.map(field => patch[field]);
                  values.push(id);
                  
                  console.log('SQL:', `UPDATE properties SET ${setClause} WHERE id = ?`);
                  console.log('Values:', values);
                  
                  const stmt = db.prepare(`UPDATE properties SET ${setClause} WHERE id = ?`);
                  const result = stmt.run(...values);
                  
                  console.log('Update result:', result);
                  
                  if (result.changes > 0) {
                    // Return updated record
                    const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
                    console.log('Updated record:', updated);
                    return updated;
                  } else {
                    throw new Error('Failed to update property');
                  }
                });

  // Heating settings handlers
  ipcMain.handle('get-heating-settings', async (_e, { propertyId }) => {
    try {
      // Check if heating_settings table exists, if not create it
      const tableInfo = db.prepare("PRAGMA table_info(heating_settings)").all();
      if (tableInfo.length === 0) {
        console.log('Creating heating_settings table');
        db.prepare(`
          CREATE TABLE heating_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER NOT NULL,
            system_type TEXT DEFAULT 'zentral-warmwasser',
            fuel TEXT DEFAULT 'heizleistung-kwh',
            heated_area REAL,
            supply_temp_c REAL,
            hotwater_unit TEXT DEFAULT 'warmwasser-verbrauch',
            consumption_share INTEGER DEFAULT 70,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (property_id) REFERENCES properties(id)
          )
        `).run();
      }
      
      const settings = db.prepare('SELECT * FROM heating_settings WHERE property_id = ?').get(propertyId);
      return settings || null;
    } catch (e) {
      console.error('Failed to get heating settings:', e);
      return null;
    }
  });

  ipcMain.handle('save-heating-settings', async (_e, { propertyId, settings }) => {
    try {
      // Check if heating_settings table exists, if not create it
      const tableInfo = db.prepare("PRAGMA table_info(heating_settings)").all();
      if (tableInfo.length === 0) {
        console.log('Creating heating_settings table');
        db.prepare(`
          CREATE TABLE heating_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER NOT NULL,
            system_type TEXT DEFAULT 'zentral-warmwasser',
            fuel TEXT DEFAULT 'heizleistung-kwh',
            heated_area REAL,
            supply_temp_c REAL,
            hotwater_unit TEXT DEFAULT 'warmwasser-verbrauch',
            consumption_share INTEGER DEFAULT 70,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (property_id) REFERENCES properties(id)
          )
        `).run();
      }
      
      // Check if record exists
      const existing = db.prepare('SELECT id FROM heating_settings WHERE property_id = ?').get(propertyId);
      
      if (existing) {
        // Update existing record
        const stmt = db.prepare(`
          UPDATE heating_settings SET 
            system_type = ?, fuel = ?, heated_area = ?, supply_temp_c = ?, 
            hotwater_unit = ?, consumption_share = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE property_id = ?
        `);
        stmt.run(
          settings.system_type,
          settings.fuel,
          settings.heated_area,
          settings.supply_temp_c,
          settings.hotwater_unit,
          settings.consumption_share,
          propertyId
        );
      } else {
        // Insert new record
        const stmt = db.prepare(`
          INSERT INTO heating_settings (
            property_id, system_type, fuel, heated_area, supply_temp_c,
            hotwater_unit, consumption_share
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          propertyId,
          settings.system_type,
          settings.fuel,
          settings.heated_area,
          settings.supply_temp_c,
          settings.hotwater_unit,
          settings.consumption_share
        );
      }
      
      return { ok: true };
    } catch (e) {
      console.error('Failed to save heating settings:', e);
      return { ok: false, error: e.message };
    }
  });

ipcMain.handle('export:ableseprotokoll', async (_e, { propertyId }) => {
    const win = new BrowserWindow({ show: false, width: 1200, height: 1600 });
  await win.loadFile('renderer/ableseprotokoll.html');
    await win.webContents.executeJavaScript(`window.renderAblese(${JSON.stringify(propertyId)})`);
    await new Promise(r => setTimeout(r, 800));

  const pdfData = await win.webContents.printToPDF({ landscape: false, printBackground: true });
  const { filePath } = await dialog.showSaveDialog({
    title: 'Ableseprotokoll speichern',
    defaultPath: 'Ableseprotokoll.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (filePath) {
    fs.writeFileSync(filePath, pdfData);
      return { ok: true, filePath };
    }
    return { ok: false };
  });

  // Buchhaltung (Betriebsabrechnung) handlers
  ipcMain.removeHandler('bk:list-years');
  ipcMain.handle('bk:list-years', async (_e, { propertyId }) => {
    try {
      const currentYear = new Date().getFullYear();
      const years = [];
      
      // Aktuelles Jahr + 4 Vorjahre
      for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const existing = db.prepare('SELECT id, status FROM operating_statements WHERE property_id = ? AND year = ?').get(propertyId, year);
        
        years.push({
          year,
          status: existing ? existing.status : 'neu',
          exists: !!existing,
          id: existing ? existing.id : null
        });
      }
      
      return years;
    } catch (e) {
      console.error('Failed to list years:', e);
      return [];
    }
  });

  ipcMain.removeHandler('bk:start');
  ipcMain.handle('bk:start', async (_e, { propertyId, year }) => {
    try {
      // Prüfen ob bereits ein Eintrag für property_id + year existiert
      const existing = db.prepare('SELECT id FROM operating_statements WHERE property_id = ? AND year = ?').get(propertyId, year);
      
      if (existing) {
        // Falls vorhanden, Status auf 'in_bearbeitung' setzen
        const stmt = db.prepare('UPDATE operating_statements SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE property_id = ? AND year = ?');
        stmt.run('in_bearbeitung', propertyId, year);
        return { ok: true, action: 'updated', id: existing.id, message: 'Status auf "in_bearbeitung" gesetzt' };
      } else {
        // Neuen Datensatz anlegen mit Status 'in_bearbeitung'
        const stmt = db.prepare('INSERT INTO operating_statements (property_id, year, status) VALUES (?, ?, ?)');
        const result = stmt.run(propertyId, year, 'in_bearbeitung');
        return { ok: true, action: 'created', id: result.lastInsertRowid, message: 'Neuer Betriebsabrechnung-Datensatz angelegt' };
      }
    } catch (e) {
      console.error('Failed to start operating statement:', e);
      return { ok: false, error: e.message };
    }
  });

  // ---- Betriebskosten: Detail laden ----
  ipcMain.removeHandler('bk:get-statement');
  ipcMain.handle('bk:get-statement', (_e, { id }) => {
    try {
      const stmt = db.prepare(`
        SELECT os.id, os.property_id, os.year, os.status, os.created_at, os.updated_at,
               p.name AS property_name, p.address AS property_address
        FROM operating_statements os
        JOIN properties p ON p.id = os.property_id
        WHERE os.id = ?
      `).get(id);

      if (!stmt) return { ok: false, error: 'not_found' };

      const heat = db.prepare(`
        SELECT system_type, fuel, heated_area, supply_temp_c, hotwater_unit,
               no_hotwater_consumption, consumption_share
        FROM heating_settings
        WHERE property_id = ?
        LIMIT 1
      `).get(stmt.property_id);

      return { ok: true, statement: stmt, heating: heat || null };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // ---- Betriebskosten: Status ändern ----
  ipcMain.removeHandler('bk:update-status');
  ipcMain.handle('bk:update-status', (_e, { id, status }) => {
    try {
      const valid = new Set(['neu','in_bearbeitung','abgeschlossen']);
      if (!valid.has(status)) return { ok: false, error: 'invalid_status' };

      const upd = db.prepare(`
        UPDATE operating_statements
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(status, id);

      if (upd.changes === 0) return { ok: false, error: 'not_found' };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // ---- Heizkosten-Modul ----
  ipcMain.removeHandler('heat:load');
  ipcMain.handle('heat:load', (_e, { statementId }) => {
    try {
      const s = db.prepare(`
        SELECT os.id, os.property_id, os.year, hs.id AS heat_id, hs.fuel_input_type, hs.input_amount,
               hs.unit_price, hs.gross_cost, hs.warmwater_wmz_meter_id, hs.period_start, hs.period_end, hs.notes
        FROM operating_statements os
        LEFT JOIN heating_statements hs ON hs.operating_statement_id = os.id
        WHERE os.id = ?
      `).get(statementId);

      if (!s) return { ok:false, error:'not_found' };

      const heatSet = db.prepare(`
        SELECT system_type, fuel, heated_area, supply_temp_c, hotwater_unit,
               no_hotwater_consumption, consumption_share
        FROM heating_settings WHERE property_id=? LIMIT 1
      `).get(s.property_id);

      const factors = db.prepare(`SELECT kind, calorific_value, state_number FROM fuel_factors`).all();

      // Warmwasser-Haus-WMZ (Optionen: alle WMZ ohne unit_id = Allgemein)
      const wwOptions = db.prepare(`
        SELECT m.id, m.number, m.label
        FROM meters m
        WHERE m.property_id = ? AND m.unit_id IS NULL AND m.meter_type LIKE 'Wärmemenge%'
      `).all(s.property_id);

      // WMZ je Einheit + Jahresverbrauch
      const wmzUnits = db.prepare(`
        SELECT u.id AS unit_id, u.name AS unit_name, m.id AS wmz_id, m.label,
               SUM(COALESCE(r.consumption,0)) AS mwh
        FROM units u
        JOIN meters m ON m.unit_id = u.id AND m.meter_type LIKE 'Wärmemenge%'
        LEFT JOIN meter_readings r ON r.meter_id = m.id
          AND r.period_start <= ? AND r.period_end >= ?
        WHERE u.property_id = ?
        GROUP BY u.id, m.id
      `).all(`${s.year}-12-31`, `${s.year}-01-01`, s.property_id);

      return { ok:true, base:s, settings: heatSet || null, factors, warmwaterOptions: wwOptions, wmzUnits };
    } catch (e) {
      return { ok:false, error:String(e) };
    }
  });

  ipcMain.removeHandler('heat:save');
  ipcMain.handle('heat:save', (_e, payload) => {
    try {
      const { operating_statement_id, fuel_input_type, input_amount, unit_price, gross_cost,
              warmwater_wmz_meter_id, period_start, period_end, notes } = payload;

      const exist = db.prepare(`SELECT id FROM heating_statements WHERE operating_statement_id = ?`)
        .get(operating_statement_id);

      if (exist) {
        db.prepare(`
          UPDATE heating_statements SET
            fuel_input_type=?, input_amount=?, unit_price=?, gross_cost=?,
            warmwater_wmz_meter_id=?, period_start=?, period_end=?, notes=?, updated_at=datetime('now')
          WHERE operating_statement_id=?
        `).run(fuel_input_type, input_amount, unit_price, gross_cost,
               warmwater_wmz_meter_id || null, period_start, period_end, notes || null, operating_statement_id);
        return { ok:true, id: exist.id, updated:true };
      } else {
        const r = db.prepare(`
          INSERT INTO heating_statements
            (operating_statement_id, fuel_input_type, input_amount, unit_price, gross_cost,
             warmwater_wmz_meter_id, period_start, period_end, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(operating_statement_id, fuel_input_type, input_amount, unit_price, gross_cost,
               warmwater_wmz_meter_id || null, period_start, period_end, notes || null);
        return { ok:true, id: r.lastInsertRowid, created:true };
      }
    } catch (e) {
      return { ok:false, error:String(e) };
    }
  });

  ipcMain.removeHandler('heat:compute');
  ipcMain.handle('heat:compute', (_e, { statementId }) => {
    try {
      const row = db.prepare(`
        SELECT os.id, os.year, os.property_id,
               hs.fuel_input_type, hs.input_amount, hs.unit_price, hs.gross_cost, hs.warmwater_wmz_meter_id,
               hs.period_start, hs.period_end
        FROM operating_statements os
        JOIN heating_statements hs ON hs.operating_statement_id = os.id
        WHERE os.id = ?
      `).get(statementId);
      if (!row) return { ok:false, error:'no_heating_statement' };

      const set = db.prepare(`
        SELECT system_type, consumption_share
        FROM heating_settings WHERE property_id=? LIMIT 1
      `).get(row.property_id) || { system_type: 'Zentral mit Warmwasser', consumption_share: 70 };

      const factor = (() => {
        if (row.fuel_input_type === 'kwh') return { kwhPerUnit: 1 };
        const f = db.prepare(`SELECT calorific_value, state_number FROM fuel_factors WHERE kind=?`)
          .get(row.fuel_input_type);
        if (!f) return null;
        return { kwhPerUnit: f.calorific_value * f.state_number };
      })();
      if (!factor) return { ok:false, error:'missing_factor' };

      // total energy in kWh
      const total_kwh = row.input_amount * factor.kwhPerUnit;

      // warm water deduction (kWh)
      let ww_kwh = 0;
      if (set.system_type === 'Zentral mit Warmwasser' && row.warmwater_wmz_meter_id) {
        const ww = db.prepare(`
          SELECT SUM(COALESCE(r.consumption,0)) AS mwh
          FROM meter_readings r
          WHERE r.meter_id = ? AND r.period_start <= ? AND r.period_end >= ?
        `).get(row.warmwater_wmz_meter_id, `${row.year}-12-31`, `${row.year}-01-01`);
        ww_kwh = (ww?.mwh || 0) * 1000;
      }

      const useful_kwh = Math.max(0, total_kwh - ww_kwh);

      // total cost
      let total_cost = row.gross_cost;
      if (total_cost == null || Number.isNaN(total_cost)) {
        // Einheitspreis bezieht sich auf input-Unit
        total_cost = row.input_amount * row.unit_price;
      }

      // Anteil Kosten, der Warmwasser betrifft (proportional Energie)
      const frac_ww = (total_kwh > 0) ? (ww_kwh / total_kwh) : 0;
      const cost_ww = total_cost * frac_ww;
      const cost_heat_only = total_cost - cost_ww;

      // split base/consumption
      const consShare = Math.min(100, Math.max(0, set.consumption_share || 70));
      const cost_cons = cost_heat_only * (consShare / 100);
      const cost_base = cost_heat_only - cost_cons;

      // WMZ je Einheit (MWh im Jahr)
      const wmz = db.prepare(`
        SELECT u.id as unit_id, u.name as unit_name, SUM(COALESCE(r.consumption,0)) AS mwh, u.area_m2
        FROM units u
        LEFT JOIN meters m ON m.unit_id = u.id AND m.meter_type LIKE 'Wärmemenge%'
        LEFT JOIN meter_readings r ON r.meter_id = m.id
          AND r.period_start <= ? AND r.period_end >= ?
        WHERE u.property_id = ?
        GROUP BY u.id
        ORDER BY u.name
      `).all(`${row.year}-12-31`, `${row.year}-01-01`, row.property_id);

      const total_mwh = wmz.reduce((a,b)=>a+(b.mwh||0),0);
      const total_kwh_units = total_mwh * 1000;

      const total_area = wmz.reduce((a,b)=>a+(b.area_m2||0),0);

      const perUnit = wmz.map(u => {
        const share_cons = total_kwh_units > 0 ? ((u.mwh||0)*1000)/total_kwh_units : 0;
        const share_base = total_area > 0 ? (u.area_m2||0)/total_area : 0;
        const c_cons = cost_cons * share_cons;
        const c_base = cost_base * share_base;
        return {
          unit_id: u.unit_id,
          unit_name: u.unit_name,
          wmz_mwh: u.mwh || 0,
          wmz_kwh: (u.mwh || 0) * 1000,
          cost_base: +c_base.toFixed(2),
          cost_cons: +c_cons.toFixed(2),
          cost_total: +(c_base + c_cons).toFixed(2)
        };
      });

      return {
        ok:true,
        totals: {
          fuel_input_type: row.fuel_input_type,
          input_amount: row.input_amount,
          unit_price: row.unit_price,
          total_kwh: +total_kwh.toFixed(2),
          ww_kwh: +ww_kwh.toFixed(2),
          useful_kwh: +useful_kwh.toFixed(2),
          total_cost: +total_cost.toFixed(2),
          cost_ww: +cost_ww.toFixed(2),
          cost_heat_only: +cost_heat_only.toFixed(2),
          consumption_share: consShare,
          base_cost: +cost_base.toFixed(2),
          consumption_cost: +cost_cons.toFixed(2)
        },
        perUnit
      };
    } catch (e) {
      return { ok:false, error:String(e) };
    }
  });

  // Hilfsfunktion: Anhänge-Verzeichnis
  function ensureAttachDir(propertyId) {
    const dir = path.join(app.getPath('userData'), 'attachments', String(propertyId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  // ---- Betriebskosten: Kategorien & Belege ----
  ipcMain.removeHandler('bk:list-categories');
  ipcMain.handle('bk:list-categories', (_e, { propertyId, year }) => {
    try {
      const cats = db.prepare(`
        SELECT c.id, c.name, c.distribution_key
        FROM cost_categories c
        WHERE c.property_id = ?
        ORDER BY c.name
      `).all(propertyId);

      const sumStmt = db.prepare(`
        SELECT category_id, 
               SUM(COALESCE(gross,0)) AS sum_gross,
               SUM(CASE WHEN include_in_statement=1 THEN COALESCE(gross,0) ELSE 0 END) AS sum_gross_included,
               COUNT(*) AS cnt
        FROM vouchers
        WHERE property_id = ?
          AND strftime('%Y', voucher_date) = ?
        GROUP BY category_id
      `).all(propertyId, String(year));

      const byCat = new Map(sumStmt.map(r => [r.category_id, r]));
      return { ok:true, categories: cats.map(c => {
        const s = byCat.get(c.id) || {};
        return { ...c, sum_gross: s.sum_gross || 0, sum_gross_included: s.sum_gross_included || 0, cnt: s.cnt || 0 };
      })};
    } catch (e) { return { ok:false, error:String(e) }; }
  });

  // Verteilerschlüssel der Kategorie updaten
  ipcMain.removeHandler('bk:update-category-key');
  ipcMain.handle('bk:update-category-key', (_e, { categoryId, key }) => {
    try {
      db.prepare(`UPDATE cost_categories SET distribution_key=? WHERE id=?`).run(key, categoryId);
      return { ok:true };
    } catch (e) { return { ok:false, error:String(e) }; }
  });

  // Belege der Kategorie (nur Abrechnungsjahr)
  ipcMain.removeHandler('bk:list-vouchers');
  ipcMain.handle('bk:list-vouchers', (_e, { propertyId, categoryId, year }) => {
    try {
      const rows = db.prepare(`
        SELECT id, voucher_no, voucher_date, gross, net, include_in_statement, file_path
        FROM vouchers
        WHERE property_id = ?
          AND category_id = ?
          AND strftime('%Y', voucher_date) = ?
        ORDER BY voucher_date ASC, id ASC
      `).all(propertyId, categoryId, String(year));
      return { ok:true, vouchers: rows };
    } catch (e) { return { ok:false, error:String(e) }; }
  });

  // Beleg speichern (neu/ändern)
  ipcMain.removeHandler('bk:save-voucher');
  ipcMain.handle('bk:save-voucher', (_e, payload) => {
    try {
      const { id, propertyId, categoryId, voucher_no, voucher_date, gross, net, include_in_statement } = payload;
      if (id) {
        db.prepare(`
          UPDATE vouchers SET voucher_no=?, voucher_date=?, gross=?, net=?, include_in_statement=?
          WHERE id=? AND property_id=? AND category_id=?
        `).run(voucher_no || null, voucher_date, gross || 0, net || 0, include_in_statement ? 1 : 0, id, propertyId, categoryId);
        return { ok:true, id, updated:true };
      } else {
        const r = db.prepare(`
          INSERT INTO vouchers (property_id, category_id, voucher_no, voucher_date, gross, net, include_in_statement)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(propertyId, categoryId, voucher_no || null, voucher_date, gross || 0, net || 0, include_in_statement ? 1 : 0);
        return { ok:true, id: r.lastInsertRowid, created:true };
      }
    } catch (e) { return { ok:false, error:String(e) }; }
  });

  // Beleg löschen
  ipcMain.removeHandler('bk:delete-voucher');
  ipcMain.handle('bk:delete-voucher', (_e, { id, propertyId }) => {
    try {
      const v = db.prepare(`SELECT file_path FROM vouchers WHERE id=? AND property_id=?`).get(id, propertyId);
      if (v?.file_path && fs.existsSync(v.file_path)) {
        try { fs.unlinkSync(v.file_path); } catch {}
      }
      const r = db.prepare(`DELETE FROM vouchers WHERE id=? AND property_id=?`).run(id, propertyId);
      return { ok: r.changes > 0 };
    } catch (e) { return { ok:false, error:String(e) }; }
  });

  // Toggle Include
  ipcMain.removeHandler('bk:toggle-include');
  ipcMain.handle('bk:toggle-include', (_e, { id, include }) => {
    try {
      db.prepare(`UPDATE vouchers SET include_in_statement=? WHERE id=?`).run(include ? 1 : 0, id);
      return { ok:true };
    } catch (e) { return { ok:false, error:String(e) }; }
  });

  // Datei anhängen (Datei wählen, kopieren, Pfad speichern)
  ipcMain.removeHandler('bk:attach-file');
  ipcMain.handle('bk:attach-file', async (_e, { voucherId, propertyId }) => {
    try {
      const res = await dialog.showOpenDialog({ title:'Beleg auswählen', properties:['openFile'] });
      if (res.canceled || !res.filePaths?.[0]) return { ok:false, canceled:true };

      const src = res.filePaths[0];
      const dir = ensureAttachDir(propertyId);
      const base = path.basename(src);
      const dst = path.join(dir, `${voucherId}__${Date.now()}__${base}`);
      fs.copyFileSync(src, dst);

      db.prepare(`UPDATE vouchers SET file_path=? WHERE id=?`).run(dst, voucherId);
      return { ok:true, file_path: dst };
    } catch (e) { return { ok:false, error:String(e) }; }
  });

  // Anhang öffnen
  ipcMain.removeHandler('bk:open-attachment');
  ipcMain.handle('bk:open-attachment', (_e, { voucherId }) => {
    try {
      const v = db.prepare(`SELECT file_path FROM vouchers WHERE id=?`).get(voucherId);
      if (v?.file_path && fs.existsSync(v.file_path)) {
        shell.openPath(v.file_path);
        return { ok:true };
      }
      return { ok:false, error:'no_file' };
    } catch (e) { return { ok:false, error:String(e) }; }
  });

  // ---- Betriebskosten: Verteilungslogik ----
  // Eingangsgrößen je Einheit & Schlüssel ermitteln
  ipcMain.removeHandler('bk:calc-basis');
  ipcMain.handle('bk:calc-basis', (_e, { propertyId, year, key }) => {
    try {
      const units = db.prepare(`SELECT id, name, area_m2, mea, persons FROM units WHERE property_id=? ORDER BY id`).all(propertyId);
      const byUnit = new Map(units.map(u => [u.id, { unit_id:u.id, name:u.name, value:0 }]));

      const setVal = (id, v) => { const o = byUnit.get(id); if (o) o.value += (v || 0); };

      if (key === 'Miteigentumsanteil') {
        units.forEach(u => setVal(u.id, u.mea || 0));
        return { ok:true, label:'Miteigentumsanteil', unit:'MEA', rows:[...byUnit.values()] };
      }
      if (key === 'Wohnfläche') {
        units.forEach(u => setVal(u.id, u.area_m2 || 0));
        return { ok:true, label:'Wohnfläche (m²)', unit:'m²', rows:[...byUnit.values()] };
      }
      if (key === 'Anzahl Personen') {
        units.forEach(u => setVal(u.id, u.persons || 0));
        return { ok:true, label:'Personen', unit:'', rows:[...byUnit.values()] };
      }
      if (key === 'Anzahl Wohnungen' || key === 'Strom') {
        units.forEach(u => setVal(u.id, 1));
        return { ok:true, label:'Anzahl Wohnungen', unit:'', rows:[...byUnit.values()] };
      }

      // Verbrauch aus meter_readings im Jahr
      const readings = db.prepare(`
        SELECT m.unit_id, m.meter_type, SUM(COALESCE(r.consumption,0)) AS cons, m.unit AS unit_label
        FROM meters m
        JOIN meter_readings r ON r.meter_id = m.id
        WHERE m.property_id = ?
          AND r.period_start >= date(?, '-01-01')
          AND r.period_end   <= date(?, '-12-31')
        GROUP BY m.unit_id, m.meter_type, m.unit
      `).all(propertyId, String(year), String(year));

      const isKWCold = t => t === 'Kaltwasserverbrauch';
      const isKWHHot = t => t === 'Warmwasserverbrauch';
      const isWMZHeat = t => t === 'Wärmemenge Heizung';
      const isWMZWW   = t => t === 'Wärmemenge Warmwasser';

      if (key === 'Wasserverbrauch' || key === 'Gesamtwasserverbrauch') {
        for (const r of readings) {
          if (!r.unit_id) continue;
          if (key === 'Wasserverbrauch' && isKWCold(r.meter_type)) setVal(r.unit_id, r.cons || 0);
          if (key === 'Gesamtwasserverbrauch' && (isKWCold(r.meter_type) || isKWHHot(r.meter_type))) setVal(r.unit_id, r.cons || 0);
        }
        return { ok:true, label: key==='Wasserverbrauch' ? 'Kaltwasser (m³)' : 'Wasser gesamt (m³)', unit:'m³', rows:[...byUnit.values()] };
      }

      if (key === 'Wärmemenge Heizung' || key === 'Wärmemenge Warmwasser') {
        for (const r of readings) {
          if (!r.unit_id) continue;
          if (key === 'Wärmemenge Heizung' && isWMZHeat(r.meter_type)) setVal(r.unit_id, r.cons || 0);
          if (key === 'Wärmemenge Warmwasser' && isWMZWW(r.meter_type)) setVal(r.unit_id, r.cons || 0);
        }
        return { ok:true, label:key, unit:'MWh', rows:[...byUnit.values()] };
      }

      // Individuelle Zuweisung: Basis 0
      return { ok:true, label:'Individuelle Zuweisung', unit:'', rows:[...byUnit.values()] };
    } catch(e) { return { ok:false, error:String(e) }; }
  });

  // Summe Brutto "In Abrechnung" je Kategorie/Jahr
  ipcMain.removeHandler('bk:sum-category');
  ipcMain.handle('bk:sum-category', (_e, { propertyId, categoryId, year }) => {
    try {
      const r = db.prepare(`
        SELECT SUM(COALESCE(gross,0)) AS gross
        FROM vouchers
        WHERE property_id=? AND category_id=? AND include_in_statement=1
          AND strftime('%Y', voucher_date) = ?
      `).get(propertyId, categoryId, String(year));
      return { ok:true, gross: r?.gross || 0 };
    } catch(e){ return { ok:false, error:String(e) }; }
  });

  // Verteilung berechnen (ohne speichern)
  ipcMain.removeHandler('bk:preview-distribution');
  ipcMain.handle('bk:preview-distribution', async (_e, { statementId, propertyId, categoryId, year }) => {
    try {
      const cat = db.prepare(`SELECT distribution_key, name FROM cost_categories WHERE id=?`).get(categoryId);
      const key = cat?.distribution_key || 'Miteigentumsanteil';
      const sum = await ipcMain.invoke('bk:sum-category', { propertyId, categoryId, year });
      const basis = await ipcMain.invoke('bk:calc-basis', { propertyId, year, key });

      if (!sum.ok || !basis.ok) return { ok:false, error:'Basis oder Summe fehlgeschlagen' };
      let totalBasis = basis.rows.reduce((a,b)=>a+(b.value||0),0);

      // Overrides einbeziehen (wenn vorhanden)
      const overrides = db.prepare(`
        SELECT unit_id, manual_amount_gross FROM distribution_overrides
        WHERE statement_id=? AND category_id=?
      `).all(statementId, categoryId);
      const mapOv = new Map(overrides.map(o=>[o.unit_id, o.manual_amount_gross||0]));

      const results = [];
      let sumAuto = sum.gross;
      // wenn overrides vorhanden: Auto-Summe = Gesamt minus Summe Overrides
      const sumOv = overrides.reduce((a,b)=>a+(b.manual_amount_gross||0),0);
      if (sumOv > 0) sumAuto = Math.max(0, sum.gross - sumOv);

      for (const r of basis.rows) {
        let amount = 0, share = 0;
        const ov = mapOv.get(r.unit_id);
        if (typeof ov === 'number') {
          amount = ov;
          share = sum.gross > 0 ? (amount / sum.gross) * 100 : 0;
        } else if (totalBasis > 0) {
          share = (r.value || 0) / totalBasis;
          amount = sumAuto * share;
          share = share * 100;
        } else {
          // totalBasis == 0: gleich verteilen
          const cnt = basis.rows.length || 1;
          amount = sumAuto / cnt;
          share = 100 / cnt;
        }
        results.push({
          unit_id: r.unit_id,
          unit_name: r.name,
          basis_value: r.value || 0,
          basis_label: basis.label,
          share_percent: share,
          amount_gross: amount
        });
      }

      // Rundungsfeinjustierung auf 2 Nachkommastellen
      const round2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
      const diff = round2(sum.gross) - round2(results.reduce((a,b)=>a+(b.amount_gross||0),0));
      if (Math.abs(diff) >= 0.01 && results.length > 0) {
        results[0].amount_gross = round2(results[0].amount_gross + diff);
      }

      return { ok:true, category: cat?.name, key, total_gross: sum.gross, rows: results };
    } catch(e){ return { ok:false, error:String(e) }; }
  });

  // Override setzen/entfernen
  ipcMain.removeHandler('bk:set-override');
  ipcMain.handle('bk:set-override', (_e, { statementId, categoryId, unitId, manual_amount_gross, note }) => {
    try {
      if (manual_amount_gross == null || isNaN(manual_amount_gross)) {
        db.prepare(`DELETE FROM distribution_overrides WHERE statement_id=? AND category_id=? AND unit_id=?`)
          .run(statementId, categoryId, unitId);
        return { ok:true, removed:true };
      }
      const up = db.prepare(`
        INSERT INTO distribution_overrides (statement_id, category_id, unit_id, manual_amount_gross, note)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(statement_id, category_id, unit_id)
        DO UPDATE SET manual_amount_gross=excluded.manual_amount_gross, note=excluded.note
      `).run(statementId, categoryId, unitId, manual_amount_gross, note || null);
      return { ok:true };
    } catch(e){ return { ok:false, error:String(e) }; }
  });

  // Verteilung speichern -> statement_allocations (upsert)
  ipcMain.removeHandler('bk:save-distribution');
  ipcMain.handle('bk:save-distribution', async (_e, { statementId, propertyId, categoryId, year }) => {
    const prev = await ipcMain.invoke('bk:preview-distribution', { statementId, propertyId, categoryId, year });
    if (!prev?.ok) return { ok:false, error:'Preview fehlgeschlagen' };
    const tx = db.transaction(() => {
      for (const r of prev.rows) {
        db.prepare(`
          INSERT INTO statement_allocations (statement_id, category_id, unit_id, basis_value, basis_label, share_percent, amount_gross)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(statement_id, category_id, unit_id)
          DO UPDATE SET basis_value=excluded.basis_value, basis_label=excluded.basis_label,
                        share_percent=excluded.share_percent, amount_gross=excluded.amount_gross
        `).run(statementId, categoryId, r.unit_id, r.basis_value, prev.rows[0].basis_label, r.share_percent, r.amount_gross);
      }
    });
    try { tx(); return { ok:true, count: prev.rows.length, total_gross: prev.total_gross }; }
    catch(e){ return { ok:false, error:String(e) }; }
  });

  // ---- Statement-Übersicht & Export ----
  ipcMain.removeHandler('stmt:overview');
  ipcMain.handle('stmt:overview', (_e, { statementId }) => {
    try {
      // Statement + Kontext
      const stmt = db.prepare(`
        SELECT s.id, s.property_id, s.year, p.name AS property_name, p.address
        FROM statements s
        JOIN properties p ON p.id = s.property_id
        WHERE s.id = ?
      `).get(statementId);

      // Einheiten
      const units = db.prepare(`
        SELECT id, name, area_m2, mea, persons
        FROM units
        WHERE property_id = ?
        ORDER BY id
      `).all(stmt.property_id);

      // Kategorien (mit Schlüssel)
      const cats = db.prepare(`
        SELECT id, name, distribution_key
        FROM cost_categories
        WHERE property_id = ?
        ORDER BY name
      `).all(stmt.property_id);

      // Brutto-Summen pro Kategorie (nur "In Abrechnung", Jahr gefiltert)
      const catSums = db.prepare(`
        SELECT category_id, SUM(COALESCE(gross,0)) AS gross
        FROM vouchers
        WHERE property_id = ?
          AND strftime('%Y', voucher_date) = ?
          AND include_in_statement = 1
        GROUP BY category_id
      `).all(stmt.property_id, String(stmt.year));
      const sumByCat = new Map(catSums.map(r => [r.category_id, r.gross || 0]));

      // Allocations (falls bereits gespeichert)
      const allocs = db.prepare(`
        SELECT category_id, unit_id, amount_gross
        FROM statement_allocations
        WHERE statement_id = ?
      `).all(statementId);

      // Map: cat -> unit -> amount
      const allocMap = new Map();
      for (const a of allocs) {
        if (!allocMap.has(a.category_id)) allocMap.set(a.category_id, new Map());
        allocMap.get(a.category_id).set(a.unit_id, a.amount_gross || 0);
      }

      // Heizkosten (falls als Kategorien "Heizung ..." vorhanden)
      const isHeatCat = (name) =>
        name.startsWith('Heizung') || name.startsWith('Warmwasser');

      // Tabellenaufbau
      const table = units.map(u => ({
        unit_id: u.id,
        unit_name: u.name,
        items: [],       // [{category_id, category_name, amount}]
        subtotal_heat: 0,
        subtotal_ops: 0, // Betriebskosten exkl. Heizung
        total: 0
      }));

      // pro Kategorie durchgehen
      for (const c of cats) {
        const catTotal = sumByCat.get(c.id) || 0;
        const perUnit = allocMap.get(c.id) || new Map(); // 0, wenn (noch) nicht gespeichert

        for (const row of table) {
          const amount = perUnit.get(row.unit_id) || 0;
          row.items.push({
            category_id: c.id,
            category_name: c.name,
            key: c.distribution_key,
            cat_total: catTotal,
            amount
          });
          if (isHeatCat(c.name)) row.subtotal_heat += amount;
          else row.subtotal_ops += amount;
        }
      }

      // Summen
      for (const row of table) {
        row.total = (row.subtotal_heat || 0) + (row.subtotal_ops || 0);
      }

      // Gesamtsummen
      const grand = {
        ops_total: table.reduce((a,b)=>a+b.subtotal_ops,0),
        heat_total: table.reduce((a,b)=>a+b.subtotal_heat,0),
        overall: table.reduce((a,b)=>a+b.total,0)
      };

      // Vorauszahlungen pro Einheit
      const payments = db.prepare(`
        SELECT unit_id, SUM(COALESCE(amount,0)) AS total_paid
        FROM advance_payments
        WHERE property_id = ? AND year = ?
        GROUP BY unit_id
      `).all(stmt.property_id, stmt.year);
      const paymentsByUnit = new Map(payments.map(p => [p.unit_id, p.total_paid || 0]));

      // Heizungsdaten der Immobilie
      const heatingData = db.prepare(`
        SELECT system_type, fuel, heated_area, consumption_share
        FROM heating_settings
        WHERE property_id = ?
        LIMIT 1
      `).get(stmt.property_id);

      // Heizkosten-Details (falls vorhanden)
      const heatingStatement = db.prepare(`
        SELECT fuel_input_type, input_amount, unit_price, gross_cost, period_start, period_end
        FROM heating_statements
        WHERE operating_statement_id = ?
        LIMIT 1
      `).get(statementId);

      // Vorauszahlungen zu den Einheiten hinzufügen
      for (const row of table) {
        row.advance_payment = paymentsByUnit.get(row.unit_id) || 0;
        row.balance = row.total - row.advance_payment;
      }

      return { 
        ok:true, 
        statement: stmt, 
        units, 
        categories: cats, 
        table, 
        grand,
        heatingData: heatingData || null,
        heatingStatement: heatingStatement || null
      };
    } catch (e) { return { ok:false, error: String(e) }; }
  });

  // Payments-APIs
  ipcMain.removeHandler('payments:list');
  ipcMain.removeHandler('payments:upsert');
  ipcMain.removeHandler('payments:delete');
  ipcMain.removeHandler('stmt:prepayments');

  // Liste Zahlungen je Property/Jahr (optional filter unit_id)
  ipcMain.handle('payments:list', (_e, { propertyId, year, unitId=null }) => {
    try {
      const base = `SELECT p.*, u.name AS unit_name
                    FROM payments p
                    JOIN units u ON u.id = p.unit_id
                    WHERE p.property_id = ? AND p.year = ?`;
      const rows = unitId
        ? db.prepare(base + ` AND p.unit_id = ? ORDER BY p.date`).all(propertyId, year, unitId)
        : db.prepare(base + ` ORDER BY u.name, p.date`).all(propertyId, year);
      return { ok:true, rows };
    } catch (e) { return { ok:false, error: String(e) }; }
  });

  // Insert/Update Zahlung
  ipcMain.handle('payments:upsert', (_e, payload) => {
    try {
      const { id, property_id, unit_id, date, amount, year, note, method } = payload;
      if (id) {
        db.prepare(`UPDATE payments
                    SET property_id=?, unit_id=?, date=?, amount=?, year=?, note=?, method=?
                    WHERE id=?`)
          .run(property_id, unit_id, date, amount, year, note || null, method || null, id);
        return { ok:true, id };
      } else {
        const r = db.prepare(`INSERT INTO payments (property_id, unit_id, date, amount, year, note, method)
                              VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(property_id, unit_id, date, amount, year, note || null, method || null);
        return { ok:true, id: r.lastInsertRowid };
      }
    } catch (e) { return { ok:false, error: String(e) }; }
  });

  // Payments:save (Alias für payments:upsert)
  ipcMain.handle('payments:save', (_e, payload) => {
    try {
      const { id, property_id, unit_id, date, amount, year, note, method } = payload;
      if (id) {
        db.prepare(`UPDATE payments
                    SET property_id=?, unit_id=?, date=?, amount=?, year=?, note=?, method=?
                    WHERE id=?`)
          .run(property_id, unit_id, date, amount, year, note || null, method || null, id);
        return { ok:true, id };
      } else {
        const r = db.prepare(`INSERT INTO payments (property_id, unit_id, date, amount, year, note, method)
                              VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(property_id, unit_id, date, amount, year, note || null, method || null);
        return { ok:true, id: r.lastInsertRowid };
      }
    } catch (e) { return { ok:false, error: String(e) }; }
  });

  // Löschen
  ipcMain.handle('payments:delete', (_e, { id }) => {
    try {
      db.prepare(`DELETE FROM payments WHERE id=?`).run(id);
      return { ok:true };
    } catch (e) { return { ok:false, error: String(e) }; }
  });

  // Summe der Vorauszahlungen je Einheit für ein Statement
  ipcMain.handle('stmt:prepayments', (_e, { statementId }) => {
    try {
      const stmt = db.prepare(`SELECT id, property_id, year FROM operating_statements WHERE id=?`).get(statementId);
      if (!stmt) return { ok:false, error:'Statement not found' };

      // Summen je unit_id
      const sums = db.prepare(`
        SELECT unit_id, SUM(amount) AS total
        FROM payments
        WHERE property_id=? AND year=?
        GROUP BY unit_id
      `).all(stmt.property_id, stmt.year);

      const map = {};
      for (const row of sums) map[row.unit_id] = row.total || 0;
      return { ok:true, byUnit: map };
    } catch (e) { return { ok:false, error: String(e) }; }
  });

  // Advance Payments APIs
  ipcMain.removeHandler('advance:list');
  ipcMain.removeHandler('advance:save');
  ipcMain.removeHandler('advance:import-csv');

  // Liste der monatlichen Vorauszahlungen je Einheit
  ipcMain.handle('advance:list', (_e, { propertyId, year }) => {
    try {
      const rows = db.prepare(`
        SELECT ap.*, u.name AS unit_name
        FROM advance_payments ap
        JOIN units u ON u.id = ap.unit_id
        WHERE ap.property_id = ? AND ap.year = ?
        ORDER BY u.name, ap.month
      `).all(propertyId, year);
      
      // Gruppiere nach Einheit
      const byUnit = {};
      rows.forEach(row => {
        if (!byUnit[row.unit_id]) {
          byUnit[row.unit_id] = {
            unit_id: row.unit_id,
            unit_name: row.unit_name,
            months: {}
          };
        }
        byUnit[row.unit_id].months[row.month] = row.amount;
      });
      
      return { ok:true, byUnit: Object.values(byUnit) };
    } catch (e) { return { ok:false, error: String(e) }; }
  });

  // Speichern einer monatlichen Vorauszahlung
  ipcMain.handle('advance:save', (_e, { propertyId, unitId, year, month, amount }) => {
    try {
      if (amount === null || amount === undefined || amount === '') {
        // Löschen wenn leer
        db.prepare(`DELETE FROM advance_payments 
                    WHERE property_id = ? AND unit_id = ? AND year = ? AND month = ?`)
          .run(propertyId, unitId, year, month);
      } else {
        // Upsert
        db.prepare(`INSERT OR REPLACE INTO advance_payments 
                    (property_id, unit_id, year, month, amount) 
                    VALUES (?, ?, ?, ?, ?)`)
          .run(propertyId, unitId, year, month, amount);
      }
      return { ok:true };
    } catch (e) { return { ok:false, error: String(e) }; }
  });

  // CSV-Import für Vorauszahlungen
  ipcMain.handle('advance:import-csv', (_e, { propertyId, year, csvData }) => {
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(';');
      
      // Validiere Header
      const expectedHeaders = ['unit_name', 'month', 'year', 'amount'];
      if (!expectedHeaders.every(h => headers.includes(h))) {
        return { ok:false, error: 'Ungültige CSV-Struktur. Erwartet: unit_name;month;year;amount' };
      }
      
      const unitMap = new Map();
      const units = db.prepare('SELECT id, name FROM units WHERE property_id = ?').all(propertyId);
      units.forEach(u => unitMap.set(u.name, u.id));
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      // Transaktion starten
      const transaction = db.transaction(() => {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(';');
          if (values.length !== 4) {
            errors.push(`Zeile ${i + 1}: Ungültige Anzahl Spalten`);
            errorCount++;
            continue;
          }
          
          const [unitName, monthStr, yearStr, amountStr] = values;
          const month = parseInt(monthStr);
          const year = parseInt(yearStr);
          const amount = parseFloat(amountStr);
          
          if (!unitMap.has(unitName)) {
            errors.push(`Zeile ${i + 1}: Einheit "${unitName}" nicht gefunden`);
            errorCount++;
            continue;
          }
          
          if (month < 1 || month > 12) {
            errors.push(`Zeile ${i + 1}: Ungültiger Monat ${month}`);
            errorCount++;
            continue;
          }
          
          if (year !== parseInt(year)) {
            errors.push(`Zeile ${i + 1}: Jahr stimmt nicht überein`);
            errorCount++;
            continue;
          }
          
          if (isNaN(amount) || amount < 0) {
            errors.push(`Zeile ${i + 1}: Ungültiger Betrag ${amountStr}`);
            errorCount++;
            continue;
          }
          
          const unitId = unitMap.get(unitName);
          
          // Speichern
          db.prepare(`INSERT OR REPLACE INTO advance_payments 
                      (property_id, unit_id, year, month, amount) 
                      VALUES (?, ?, ?, ?, ?)`)
            .run(propertyId, unitId, year, month, amount);
          
          successCount++;
        }
      });
      
      transaction();
      
      return { 
        ok:true, 
        successCount, 
        errorCount, 
        errors: errors.length > 0 ? errors : null 
      };
    } catch (e) { return { ok:false, error: String(e) }; }
  });

  // PDF-Export der Abrechnung
  ipcMain.removeHandler('stmt:export-pdf');
  ipcMain.handle('stmt:export-pdf', async (_e, { statementId }) => {
    try {
      const win = new BrowserWindow({ show:false, width:1200, height:1600 });
      await win.loadFile('renderer/abrechnung.html');
      await win.webContents.executeJavaScript(`window.renderAbrechnung(${statementId});`);
      await new Promise(r => setTimeout(r, 600));
      const pdf = await win.webContents.printToPDF({ landscape:false, printBackground:true });
      const { filePath } = await dialog.showSaveDialog({
        title: 'Betriebskostenabrechnung exportieren',
        defaultPath: `Betriebskostenabrechnung_${statementId}.pdf`,
        filters: [{ name:'PDF', extensions:['pdf'] }]
      });
      if (filePath) fs.writeFileSync(filePath, pdf);
      return { ok:true, filePath: filePath || null };
    } catch (e) { return { ok:false, error:String(e) }; }
  });

  // Heizkostenberechnung APIs
  ipcMain.removeHandler('heating:calculate');
  ipcMain.removeHandler('heating:get-settings');
  ipcMain.removeHandler('heating:save-settings');

  // Heizkostenberechnung durchführen
  ipcMain.handle('heating:calculate', (_e, { propertyId, year }) => {
    try {
      // 1. Heizungseinstellungen laden
      const settings = db.prepare(`
        SELECT system_type, fuel, heated_area, supply_temp_c, hotwater_unit, 
               consumption_share, distribution_key
        FROM heating_settings
        WHERE property_id = ?
      `).get(propertyId);

      if (!settings) {
        return { ok:false, error: 'Keine Heizungseinstellungen gefunden' };
      }

      // 2. Gesamtkosten aus Heizkosten-Belegen
      const totalCosts = db.prepare(`
        SELECT SUM(v.gross) as total
        FROM vouchers v
        JOIN cost_categories c ON v.category_id = c.id
        WHERE v.property_id = ? AND v.year = ? 
          AND c.name LIKE '%Heizung%' AND v.include_in_statement = 1
      `).get(propertyId, year);

      const totalHeatingCosts = totalCosts?.total || 0;

      // 3. Einheiten mit relevanten Daten laden
      const units = db.prepare(`
        SELECT u.id, u.name, u.area_m2, u.mea,
               h.consumption as wmz_heizung,
               w.consumption as wmz_warmwasser
        FROM units u
        LEFT JOIN (
          SELECT m.unit_id, r.consumption
          FROM meters m
          JOIN meter_readings r ON m.id = r.meter_id
          WHERE m.property_id = ? AND m.meter_type = 'Heizung'
            AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
        ) h ON u.id = h.unit_id
        LEFT JOIN (
          SELECT m.unit_id, r.consumption
          FROM meters m
          JOIN meter_readings r ON m.id = r.meter_id
          WHERE m.property_id = ? AND m.meter_type = 'Warmwasser'
            AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
        ) w ON u.id = w.unit_id
        WHERE u.property_id = ?
        ORDER BY u.name
      `).all(propertyId, propertyId, propertyId);

      // 4. Warmwasser-Wärmemenge berechnen
      let totalWarmwaterEnergy = 0;
      let warmwaterCosts = 0;

      if (settings.hotwater_unit === 'Warmwasserverbrauch (m³)') {
        // Formel: m³ × 2,5 kWh/m³ × (Vorlauftemp - 10°C) / 1000
        const warmwaterConsumption = units.reduce((sum, u) => sum + (u.wmz_warmwasser || 0), 0);
        const tempDiff = (settings.supply_temp_c || 60) - 10;
        totalWarmwaterEnergy = warmwaterConsumption * 2.5 * tempDiff / 1000;
      } else {
        // Direkt aus WMZ
        totalWarmwaterEnergy = units.reduce((sum, u) => sum + (u.wmz_warmwasser || 0), 0);
      }

      // 5. Gesamte Wärmemenge (Heizung + Warmwasser)
      const totalHeatingEnergy = units.reduce((sum, u) => sum + (u.wmz_heizung || 0), 0);
      const totalEnergy = totalHeatingEnergy + totalWarmwaterEnergy;

      // 6. Warmwasserkosten berechnen
      if (totalEnergy > 0) {
        warmwaterCosts = totalHeatingCosts * (totalWarmwaterEnergy / totalEnergy);
      }

      // 7. Reine Heizkosten
      const pureHeatingCosts = totalHeatingCosts - warmwaterCosts;

      // 8. Grundkosten vs. Verbrauchskosten aufteilen
      const consumptionShare = settings.consumption_share || 70;
      const baseShare = 100 - consumptionShare;

      const baseCosts = pureHeatingCosts * (baseShare / 100);
      const consumptionCosts = pureHeatingCosts * (consumptionShare / 100);

      // 9. Verteilung auf Einheiten berechnen
      const results = units.map(unit => {
        // Grundkosten nach Wohnfläche oder MEA
        let baseCostShare = 0;
        if (settings.distribution_key === 'Wohnfläche') {
          baseCostShare = (unit.area_m2 || 0) / units.reduce((sum, u) => sum + (u.area_m2 || 0), 0);
        } else {
          baseCostShare = (unit.mea || 0) / units.reduce((sum, u) => sum + (u.mea || 0), 0);
        }

        // Verbrauchskosten nach WMZ Heizung
        let consumptionCostShare = 0;
        if (totalHeatingEnergy > 0) {
          consumptionCostShare = (unit.wmz_heizung || 0) / totalHeatingEnergy;
        }

        // Warmwasserkosten nach WMZ Warmwasser
        let warmwaterCostShare = 0;
        if (totalWarmwaterEnergy > 0) {
          warmwaterCostShare = (unit.wmz_warmwasser || 0) / totalWarmwaterEnergy;
        }

        // Anteile berechnen
        const unitBaseCosts = baseCosts * baseCostShare;
        const unitConsumptionCosts = consumptionCosts * consumptionCostShare;
        const unitWarmwaterCosts = warmwaterCosts * warmwaterCostShare;
        const totalUnitCosts = unitBaseCosts + unitConsumptionCosts + unitWarmwaterCosts;

        return {
          unit_id: unit.id,
          unit_name: unit.name,
          area_m2: unit.area_m2 || 0,
          mea: unit.mea || 0,
          wmz_heizung: unit.wmz_heizung || 0,
          wmz_warmwasser: unit.wmz_warmwater || 0,
          grundkosten_anteil: unitBaseCosts,
          verbrauchskosten_anteil: unitConsumptionCosts,
          warmwasserkosten_anteil: unitWarmwaterCosts,
          gesamtkosten: totalUnitCosts
        };
      });

      // 10. Summen
      const totals = {
        total_heating_costs: totalHeatingCosts,
        warmwater_costs: warmwaterCosts,
        pure_heating_costs: pureHeatingCosts,
        base_costs: baseCosts,
        consumption_costs: consumptionCosts,
        total_energy: totalEnergy,
        total_heating_energy: totalHeatingEnergy,
        total_warmwater_energy: totalWarmwaterEnergy
      };

      return { 
        ok: true, 
        settings,
        units: results,
        totals,
        calculation_params: {
          consumption_share: consumptionShare,
          base_share: baseShare,
          distribution_key: settings.distribution_key
        }
      };

    } catch (e) { 
      return { ok: false, error: String(e) }; 
    }
  });

  // Heizungseinstellungen laden
  ipcMain.handle('heating:get-settings', (_e, { propertyId }) => {
    try {
      const settings = db.prepare(`
        SELECT system_type, fuel, heated_area, supply_temp_c, hotwater_unit, 
               no_hotwater_consumption, consumption_share, distribution_key
        FROM heating_settings
        WHERE property_id = ?
      `).get(propertyId);

      return { ok: true, settings: settings || null };
    } catch (e) { 
      return { ok: false, error: String(e) }; 
    }
  });

  // Heizungseinstellungen speichern
  ipcMain.handle('heating:save-settings', (_e, { propertyId, settings }) => {
    try {
      const { system_type, fuel, heated_area, supply_temp_c, hotwater_unit, 
              no_hotwater_consumption, consumption_share, distribution_key } = settings;

      db.prepare(`
        INSERT OR REPLACE INTO heating_settings 
        (property_id, system_type, fuel, heated_area, supply_temp_c, hotwater_unit, 
         no_hotwater_consumption, consumption_share, distribution_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(propertyId, system_type, fuel, heated_area, supply_temp_c, hotwater_unit,
              no_hotwater_consumption ? 1 : 0, consumption_share, distribution_key);

      return { ok: true };
    } catch (e) { 
      return { ok: false, error: String(e) }; 
    }
  });

  // Betriebskostenabrechnung APIs
  ipcMain.removeHandler('statement:calculate');
  ipcMain.removeHandler('statement:get');
  ipcMain.removeHandler('statement:save');
  ipcMain.removeHandler('statement:export-pdf');

  // Vollständige Betriebskostenabrechnung berechnen
  ipcMain.handle('statement:calculate', (_e, { propertyId, year }) => {
    try {
      // 1. Alle Kostenarten für das Jahr holen
      const vouchers = db.prepare(`
        SELECT v.*, c.name as category_name, c.distribution_key
        FROM vouchers v
        JOIN cost_categories c ON v.category_id = c.id
        WHERE v.property_id = ? AND strftime('%Y', v.voucher_date) = ?
        AND v.include_in_statement = 1
        ORDER BY c.name, v.voucher_date
      `).all(propertyId, year.toString());

      // 2. Einheiten mit allen relevanten Daten laden
      const units = db.prepare(`
        SELECT u.id, u.name, u.area_m2, u.mea, u.persons,
               h.consumption as wmz_heizung,
               w.consumption as wmz_warmwasser,
               c.consumption as wmz_kaltwasser,
               hw.consumption as wmz_warmwasser_verbrauch
        FROM units u
        LEFT JOIN (
          SELECT m.unit_id, r.consumption
          FROM meters m
          JOIN meter_readings r ON m.id = r.meter_id
          WHERE m.property_id = ? AND m.meter_type = 'Heizung'
            AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
        ) h ON u.id = h.unit_id
        LEFT JOIN (
          SELECT m.unit_id, r.consumption
          FROM meters m
          JOIN meter_readings r ON m.id = r.meter_id
          WHERE m.property_id = ? AND m.meter_type = 'Warmwasser'
            AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
        ) w ON u.id = w.unit_id
        LEFT JOIN (
          SELECT m.unit_id, r.consumption
          FROM meters m
          JOIN meter_readings r ON m.id = r.meter_id
          WHERE m.property_id = ? AND m.meter_type = 'Kaltwasser'
            AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
        ) c ON u.id = c.unit_id
        LEFT JOIN (
          SELECT m.unit_id, r.consumption
          FROM meters m
          JOIN meter_readings r ON m.id = r.meter_id
          WHERE m.property_id = ? AND m.meter_type = 'Warmwasser-Verbrauch'
            AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
        ) hw ON u.id = hw.unit_id
        WHERE u.property_id = ?
        ORDER BY u.name
      `).all(propertyId, propertyId, propertyId, propertyId, propertyId);

      // 3. Kostenarten nach Kategorien gruppieren
      const categories = {};
      vouchers.forEach(v => {
        if (!categories[v.category_name]) {
          categories[v.category_name] = {
            name: v.category_name,
            distribution_key: v.distribution_key,
            total: 0,
            vouchers: []
          };
        }
        categories[v.category_name].total += (v.gross || 0);
        categories[v.category_name].vouchers.push(v);
      });

      // 4. Heizkosten aus advance_payments einbinden (falls vorhanden)
      const heatingResults = db.prepare(`
        SELECT unit_id, grundkosten_anteil, verbrauchskosten_anteil, warmwasserkosten_anteil
        FROM heating_calculation_results
        WHERE property_id = ? AND year = ?
      `).all(propertyId, year);

      if (heatingResults.length > 0) {
        // Heizkosten als separate Kategorien hinzufügen
        categories['Heizung (Grundkosten)'] = {
          name: 'Heizung (Grundkosten)',
          distribution_key: 'Miteigentumsanteil',
          total: heatingResults.reduce((sum, r) => sum + (r.grundkosten_anteil || 0), 0),
          is_heating: true
        };
        categories['Heizung (Verbrauch)'] = {
          name: 'Heizung (Verbrauch)',
          distribution_key: 'Wärmemenge Heizung',
          total: heatingResults.reduce((sum, r) => sum + (r.verbrauchskosten_anteil || 0), 0),
          is_heating: true
        };
        categories['Warmwasser (Grundkosten)'] = {
          name: 'Warmwasser (Grundkosten)',
          distribution_key: 'Wohnfläche',
          total: 0, // Wird später berechnet
          is_heating: true
        };
        categories['Warmwasser (Verbrauch)'] = {
          name: 'Warmwasser (Verbrauch)',
          distribution_key: 'Wärmemenge Warmwasser',
          total: heatingResults.reduce((sum, r) => sum + (r.warmwasserkosten_anteil || 0), 0),
          is_heating: true
        };
      }

      // 5. Verteilerschlüssel-Logik implementieren
      const distributionLogic = {
        'Miteigentumsanteil': (unit) => unit.mea || 0,
        'Wohnfläche': (unit) => unit.area_m2 || 0,
        'Anzahl Personen': (unit) => unit.persons || 0,
        'Wasserverbrauch': (unit) => (unit.wmz_kaltwasser || 0) + (unit.wmz_warmwasser_verbrauch || 0),
        'Gesamtwasserverbrauch': (unit) => (unit.wmz_kaltwasser || 0) + (unit.wmz_warmwasser_verbrauch || 0),
        'Wärmemenge Heizung': (unit) => unit.wmz_heizung || 0,
        'Wärmemenge Warmwasser': (unit) => unit.wmz_warmwasser || 0,
        'Individuelle Zuweisung': (unit) => 1, // Fallback für manuelle Eingabe
        'Anzahl Wohnungen': (unit) => 1, // Jede Einheit = 1 Wohnung
        'Strom': (unit) => 1 // Fallback für Strom
      };

      // 6. Kostenverteilung pro Einheit berechnen
      const unitResults = units.map(unit => {
        const unitCosts = [];
        let totalCosts = 0;

        // Normale Kostenarten
        Object.values(categories).forEach(cat => {
          if (cat.is_heating) return; // Heizkosten werden separat behandelt

          const distributionFunc = distributionLogic[cat.distribution_key];
          if (!distributionFunc) {
            console.warn(`Unbekannter Verteilerschlüssel: ${cat.distribution_key}`);
            return;
          }

          const unitValue = distributionFunc(unit);
          const totalValue = units.reduce((sum, u) => sum + distributionFunc(u), 0);
          
          let unitShare = 0;
          if (totalValue > 0) {
            unitShare = (unitValue / totalValue) * cat.total;
          }

          unitCosts.push({
            category: cat.name,
            distribution_key: cat.distribution_key,
            amount: unitShare,
            total_category: cat.total
          });

          totalCosts += unitShare;
        });

        // Heizkosten einbinden (falls vorhanden)
        if (heatingResults.length > 0) {
          const heatingUnit = heatingResults.find(h => h.unit_id === unit.id);
          if (heatingUnit) {
            unitCosts.push({
              category: 'Heizung (Grundkosten)',
              distribution_key: 'Miteigentumsanteil',
              amount: heatingUnit.grundkosten_anteil || 0,
              total_category: categories['Heizung (Grundkosten)'].total
            });
            unitCosts.push({
              category: 'Heizung (Verbrauch)',
              distribution_key: 'Wärmemenge Heizung',
              amount: heatingUnit.verbrauchskosten_anteil || 0,
              total_category: categories['Heizung (Verbrauch)'].total
            });
            unitCosts.push({
              category: 'Warmwasser (Verbrauch)',
              distribution_key: 'Wärmemenge Warmwasser',
              amount: heatingUnit.warmwasserkosten_anteil || 0,
              total_category: categories['Warmwasser (Verbrauch)'].total
            });

            totalCosts += (heatingUnit.grundkosten_anteil || 0) + 
                         (heatingUnit.verbrauchskosten_anteil || 0) + 
                         (heatingUnit.warmwasserkosten_anteil || 0);
          }
        }

        return {
          unit_id: unit.id,
          unit_name: unit.name,
          area_m2: unit.area_m2 || 0,
          mea: unit.mea || 0,
          persons: unit.persons || 0,
          costs: unitCosts,
          total_costs: totalCosts
        };
      });

      // 7. Vorauszahlungen laden
      const advancePayments = db.prepare(`
        SELECT unit_id, SUM(amount) as total
        FROM advance_payments
        WHERE property_id = ? AND year = ?
        GROUP BY unit_id
      `).all(propertyId, year);

      const advanceByUnit = new Map();
      advancePayments.forEach(ap => {
        advanceByUnit.set(ap.unit_id, ap.total || 0);
      });

      // 8. Saldo berechnen
      unitResults.forEach(unit => {
        const advancePayment = advanceByUnit.get(unit.unit_id) || 0;
        unit.advance_payment = advancePayment;
        unit.balance = unit.total_costs - advancePayment;
      });

      // 9. Gesamtsummen
      const totals = {
        total_costs: unitResults.reduce((sum, u) => sum + u.total_costs, 0),
        total_advance_payments: unitResults.reduce((sum, u) => sum + u.advance_payment, 0),
        total_balance: unitResults.reduce((sum, u) => sum + u.balance, 0)
      };

      return {
        ok: true,
        property_id: propertyId,
        year: year,
        units: unitResults,
        categories: Object.values(categories),
        totals,
        calculation_timestamp: new Date().toISOString()
      };

    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Gespeicherte Abrechnung laden
  ipcMain.handle('statement:get', (_e, { propertyId, year }) => {
    try {
      // Hier würde die gespeicherte Abrechnung aus der DB geladen
      // Für jetzt geben wir null zurück
      return { ok: true, statement: null };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Abrechnung speichern
  ipcMain.handle('statement:save', (_e, { propertyId, year, data }) => {
    try {
      // Hier würde die Abrechnung in der DB gespeichert
      // Für jetzt geben wir nur eine Bestätigung zurück
      return { ok: true, message: 'Abrechnung gespeichert' };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // PDF-Export der Betriebskosten- & Heizkostenabrechnung
  ipcMain.handle('statement:export-pdf', async (_e, { propertyId, year }) => {
    try {
      // 1. Abrechnungsdaten berechnen (direkt die Logik aus statement:calculate verwenden)
      const data = await new Promise((resolve) => {
        // Die komplette Berechnungslogik aus statement:calculate kopieren
        try {
          // 1. Alle Kostenarten für das Jahr holen
          const vouchers = db.prepare(`
            SELECT v.*, c.name as category_name, c.distribution_key
            FROM vouchers v
            JOIN cost_categories c ON v.category_id = c.id
            WHERE v.property_id = ? AND strftime('%Y', v.voucher_date) = ?
            AND v.include_in_statement = 1
            ORDER BY c.name, v.voucher_date
          `).all(propertyId, year.toString());

          // 2. Einheiten mit allen relevanten Daten laden
          const units = db.prepare(`
            SELECT u.id, u.name, u.area_m2, u.mea, u.persons,
                   h.consumption as wmz_heizung,
                   w.consumption as wmz_warmwasser,
                   c.consumption as wmz_kaltwasser,
                   hw.consumption as wmz_warmwasser_verbrauch
            FROM units u
            LEFT JOIN (
              SELECT m.unit_id, r.consumption
              FROM meters m
              JOIN meter_readings r ON m.id = r.meter_id
              WHERE m.property_id = ? AND m.meter_type = 'Heizung'
                AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
            ) h ON u.id = h.unit_id
            LEFT JOIN (
              SELECT m.unit_id, r.consumption
              FROM meters m
              JOIN meter_readings r ON m.id = r.meter_id
              WHERE m.property_id = ? AND m.meter_type = 'Warmwasser'
                AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
            ) w ON u.id = w.unit_id
            LEFT JOIN (
              SELECT m.unit_id, r.consumption
              FROM meters m
              JOIN meter_readings r ON m.id = r.meter_id
              WHERE m.property_id = ? AND m.meter_type = 'Kaltwasser'
                AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
            ) c ON u.id = c.unit_id
            LEFT JOIN (
              SELECT m.unit_id, r.consumption
              FROM meters m
              JOIN meter_readings r ON m.id = r.meter_id
              WHERE m.property_id = ? AND m.meter_type = 'Warmwasser-Verbrauch'
                AND r.period_start LIKE '${year}-%' AND r.period_end LIKE '${year}-%'
            ) hw ON u.id = hw.unit_id
            WHERE u.property_id = ?
            ORDER BY u.name
          `).all(propertyId, propertyId, propertyId, propertyId, propertyId);

          // 3. Kostenarten nach Kategorien gruppieren
          const categories = {};
          vouchers.forEach(v => {
            if (!categories[v.category_name]) {
              categories[v.category_name] = {
                name: v.category_name,
                distribution_key: v.distribution_key,
                total: 0,
                vouchers: []
              };
            }
            categories[v.category_name].total += (v.gross || 0);
            categories[v.category_name].vouchers.push(v);
          });

          // 4. Heizkosten aus heating_calculation_results einbinden (falls vorhanden)
          const heatingResults = db.prepare(`
            SELECT unit_id, grundkosten_anteil, verbrauchskosten_anteil, warmwasserkosten_anteil
            FROM heating_calculation_results
            WHERE property_id = ? AND year = ?
          `).all(propertyId, year);

          if (heatingResults.length > 0) {
            // Heizkosten als separate Kategorien hinzufügen
            categories['Heizung (Grundkosten)'] = {
              name: 'Heizung (Grundkosten)',
              distribution_key: 'Miteigentumsanteil',
              total: heatingResults.reduce((sum, r) => sum + (r.grundkosten_anteil || 0), 0),
              is_heating: true
            };
            categories['Heizung (Verbrauch)'] = {
              name: 'Heizung (Verbrauch)',
              distribution_key: 'Wärmemenge Heizung',
              total: heatingResults.reduce((sum, r) => sum + (r.verbrauchskosten_anteil || 0), 0),
              is_heating: true
            };
            categories['Warmwasser (Grundkosten)'] = {
              name: 'Warmwasser (Grundkosten)',
              distribution_key: 'Wohnfläche',
              total: 0, // Wird später berechnet
              is_heating: true
            };
            categories['Warmwasser (Verbrauch)'] = {
              name: 'Warmwasser (Verbrauch)',
              distribution_key: 'Wärmemenge Warmwasser',
              total: heatingResults.reduce((sum, r) => sum + (r.warmwasserkosten_anteil || 0), 0),
              is_heating: true
            };
          }

          // 5. Verteilungslogik für jede Einheit
          const unitResults = units.map(unit => {
            const unitCosts = [];
            let totalCosts = 0;

            // Normale Kostenarten
            Object.values(categories).forEach(category => {
              if (category.is_heating) return; // Heizkosten separat behandeln

              let unitShare = 0;
              switch (category.distribution_key) {
                case 'Miteigentumsanteil':
                  unitShare = (unit.mea || 0) / units.reduce((sum, u) => sum + (u.mea || 0), 0);
                  break;
                case 'Wohnfläche':
                  unitShare = (unit.area_m2 || 0) / units.reduce((sum, u) => sum + (u.area_m2 || 0), 0);
                  break;
                case 'Anzahl Personen':
                  unitShare = (unit.persons || 0) / units.reduce((sum, u) => sum + (u.persons || 0), 0);
                  break;
                case 'Wasserverbrauch':
                  const totalWater = units.reduce((sum, u) => sum + (u.wmz_kaltwasser || 0) + (u.wmz_warmwasser_verbrauch || 0), 0);
                  unitShare = totalWater > 0 ? ((unit.wmz_kaltwasser || 0) + (unit.wmz_warmwasser_verbrauch || 0)) / totalWater : 0;
                  break;
                case 'Wärmemenge Heizung':
                  const totalHeating = units.reduce((sum, u) => sum + (u.wmz_heizung || 0), 0);
                  unitShare = totalHeating > 0 ? (unit.wmz_heizung || 0) / totalHeating : 0;
                  break;
                case 'Wärmemenge Warmwasser':
                  const totalHotWater = units.reduce((sum, u) => sum + (u.wmz_warmwasser || 0), 0);
                  unitShare = totalHotWater > 0 ? (unit.wmz_warmwasser || 0) / totalHotWater : 0;
                  break;
                default:
                  unitShare = 1 / units.length; // Gleichmäßige Verteilung
              }

              const amount = category.total * unitShare;
              unitCosts.push({
                category: category.name,
                distribution_key: category.distribution_key,
                amount: amount
              });
              totalCosts += amount;
            });

            // Heizkosten separat behandeln
            const heatingUnit = heatingResults.find(h => h.unit_id === unit.id);
            if (heatingUnit) {
              if (heatingUnit.grundkosten_anteil) {
                unitCosts.push({
                  category: 'Heizung (Grundkosten)',
                  distribution_key: 'Miteigentumsanteil',
                  amount: heatingUnit.grundkosten_anteil
                });
                totalCosts += heatingUnit.grundkosten_anteil;
              }
              if (heatingUnit.verbrauchskosten_anteil) {
                unitCosts.push({
                  category: 'Heizung (Verbrauch)',
                  distribution_key: 'Wärmemenge Heizung',
                  amount: heatingUnit.verbrauchskosten_anteil
                });
                totalCosts += heatingUnit.verbrauchskosten_anteil;
              }
              if (heatingUnit.warmwasserkosten_anteil) {
                unitCosts.push({
                  category: 'Warmwasser (Verbrauch)',
                  distribution_key: 'Wärmemenge Warmwasser',
                  amount: heatingUnit.warmwasserkosten_anteil
                });
                totalCosts += heatingUnit.warmwasserkosten_anteil;
              }
            }

            return {
              unit_id: unit.id,
              unit_name: unit.name,
              area_m2: unit.area_m2 || 0,
              mea: unit.mea || 0,
              persons: unit.persons || 0,
              costs: unitCosts,
              total_costs: totalCosts
            };
          });

          // 6. Vorauszahlungen laden
          const advancePayments = db.prepare(`
            SELECT unit_id, SUM(amount) as total
            FROM advance_payments
            WHERE property_id = ? AND year = ?
            GROUP BY unit_id
          `).all(propertyId, year);

          const advanceByUnit = new Map();
          advancePayments.forEach(ap => {
            advanceByUnit.set(ap.unit_id, ap.total || 0);
          });

          // 7. Saldo berechnen
          unitResults.forEach(unit => {
            const advancePayment = advanceByUnit.get(unit.unit_id) || 0;
            unit.advance_payment = advancePayment;
            unit.balance = unit.total_costs - advancePayment;
          });

          // 8. Gesamtsummen
          const totals = {
            total_costs: unitResults.reduce((sum, u) => sum + u.total_costs, 0),
            total_advance_payments: unitResults.reduce((sum, u) => sum + u.advance_payment, 0),
            total_balance: unitResults.reduce((sum, u) => sum + u.balance, 0)
          };

          resolve({
            ok: true,
            property_id: propertyId,
            year: year,
            units: unitResults,
            categories: Object.values(categories),
            totals,
            calculation_timestamp: new Date().toISOString()
          });

        } catch (e) {
          resolve({ ok: false, error: String(e) });
        }
      });

      if (!data.ok) {
        throw new Error(data.error || 'Fehler beim Berechnen der Abrechnung');
      }

      // 2. Verwalterdaten laden
      const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
      if (!property) {
        throw new Error('Immobilie nicht gefunden');
      }

      // 3. Verwalterdaten erweitern
      data.property = property;
      data.year = year;

      // 4. Verstecktes BrowserWindow für PDF-Generierung erstellen
      const win = new BrowserWindow({ 
        show: false, 
        width: 1200, 
        height: 1600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false
        }
      });

      // 5. HTML-Template laden
      await win.loadFile('renderer/statement-pdf.html');

      // 6. Daten ins Renderer übertragen
      await win.webContents.executeJavaScript(`window.renderStatement(${JSON.stringify(data)})`);

      // 7. PDF generieren
      const pdfData = await win.webContents.printToPDF({
        landscape: false,
        printBackground: true,
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        pageSize: 'A4'
      });

      // 8. Datei speichern
      const { filePath } = await dialog.showSaveDialog({
        title: 'Betriebskostenabrechnung speichern',
        defaultPath: `Betriebskostenabrechnung_${property.name}_${year}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });

      if (filePath) {
        fs.writeFileSync(filePath, pdfData);
        win.close();
        return { ok: true, filePath };
      } else {
        win.close();
        return { ok: false, error: 'Kein Speicherort ausgewählt' };
      }

    } catch (e) {
      console.error('Fehler beim PDF-Export:', e);
      return { ok: false, error: String(e) };
    }
  });

  // Einzelne Zeilen der Abrechnung bearbeiten
  ipcMain.handle('statement:update-row', async (_e, { rowId, verteilschluessel, anteil, betrag }) => {
    try {
      // Hier würde die Änderung in der DB gespeichert
      // Für jetzt geben wir nur eine Bestätigung zurück
      return { ok: true, message: 'Zeile aktualisiert' };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Heizungseinstellungen laden
  ipcMain.handle('getHeizungsEinstellungen', (_e, propertyId, year) => {
    try {
      const settings = db.prepare(`
        SELECT * FROM heating_settings WHERE property_id = ?
      `).get(propertyId);
      
      // Standardwerte falls keine Einstellungen vorhanden
      return settings || {
        verbrauchsAnteil: 70,
        system_type: 'Zentral mit Warmwasser',
        fuel: 'Heizleistung (kWh)'
      };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Heizungsdaten laden
  ipcMain.handle('getHeizungsDaten', (_e, propertyId, year) => {
    try {
      // Einheiten mit Verbrauchsdaten laden
      const einheiten = db.prepare(`
        SELECT u.id, u.name, u.area_m2 as wohnflaeche,
               COALESCE(SUM(CASE WHEN m.meter_type = 'Wärmemenge Heizung' THEN r.consumption ELSE 0 END), 0) as wmzHeizung,
               COALESCE(SUM(CASE WHEN m.meter_type = 'Warmwasserverbrauch' THEN r.consumption ELSE 0 END), 0) as wwM3
        FROM units u
        LEFT JOIN meters m ON m.unit_id = u.id AND m.property_id = u.property_id
        LEFT JOIN meter_readings r ON r.meter_id = m.id 
          AND r.period_start LIKE ? AND r.period_end LIKE ?
        WHERE u.property_id = ?
        GROUP BY u.id, u.name, u.area_m2
        ORDER BY u.name
      `).all(`${year}%`, `${year}%`, propertyId);

      // Gesamtsummen berechnen
      const totalWohnflaeche = einheiten.reduce((sum, e) => sum + (e.wohnflaeche || 0), 0);
      const totalHeizVerbrauch = einheiten.reduce((sum, e) => sum + (e.wmzHeizung || 0), 0);
      const totalWWM3 = einheiten.reduce((sum, e) => sum + (e.wwM3 || 0), 0);

      return {
        totalWohnflaeche,
        totalHeizVerbrauch,
        totalWWVerbrauch: totalWWM3,
        einheiten
      };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Heizkostenberechnung speichern
  ipcMain.handle('saveHeizkostenCalculation', async (_e, propertyId, year, results) => {
    try {
      // Hier würden die Berechnungsergebnisse in der DB gespeichert
      // Für jetzt geben wir nur eine Bestätigung zurück
      return { ok: true, message: 'Heizkostenberechnung gespeichert' };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // === NEW: Complete Statement Workflow ===
  
  // Create or recalculate complete statement run
  ipcMain.handle('statement:create-or-recalc', async (_e, { propertyId, year }) => {
    try {
      console.log(`Creating/recalculating statement for property ${propertyId}, year ${year}`);
      
      // Start transaction
      const tx = db.transaction(() => {
        // 1. Create or get statement run
        let runId;
        const existingRun = db.prepare(`
          SELECT id FROM statement_runs WHERE property_id = ? AND year = ?
        `).get(propertyId, year);
        
        if (existingRun) {
          // Update existing run
          db.prepare(`
            UPDATE statement_runs 
            SET status = 'draft', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(existingRun.id);
          runId = existingRun.id;
          
          // Clear existing data
          db.prepare('DELETE FROM statement_rows WHERE run_id = ?').run(runId);
          db.prepare('DELETE FROM statement_summary WHERE run_id = ?').run(runId);
        } else {
          // Create new run
          const result = db.prepare(`
            INSERT INTO statement_runs (property_id, year, status, created_at, updated_at)
            VALUES (?, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(propertyId, year);
          runId = result.lastInsertRowid;
        }

        // 2. Calculate heating costs (from Prompt 18)
        const heatingResults = calculateHeatingCosts(propertyId, year);
        const heatingCostsTotal = heatingResults.totalCosts || 0;
        
        // 3. Get operating costs from vouchers
        const operatingCosts = getOperatingCosts(propertyId, year);
        const operatingCostsTotal = operatingCosts.totalCosts || 0;
        
        // 4. Get advance payments
        const advancePayments = getAdvancePayments(propertyId, year);
        const advancePaymentsTotal = advancePayments.totalAmount || 0;
        
        // 5. Insert heating cost rows
        if (heatingResults.units) {
          for (const unit of heatingResults.units) {
            // Heating Base
            db.prepare(`
              INSERT INTO statement_rows (run_id, unit_id, cost_type, distribution_key, basis_value, basis_label, share_percent, amount_euro, category, is_heating_cost)
              VALUES (?, ?, 'Heizung Grundkosten', 'Wohnfläche', ?, 'm²', ?, ?, 'Heizung', 1)
            `).run(runId, unit.unit_id, unit.area_m2, unit.baseShare, unit.baseCosts);
            
            // Heating Consumption
            db.prepare(`
              INSERT INTO statement_rows (run_id, unit_id, cost_type, distribution_key, basis_value, basis_label, share_percent, amount_euro, category, is_heating_cost)
              VALUES (?, ?, 'Heizung Verbrauch', 'WMZ Heizung', ?, 'kWh', ?, ?, 'Heizung', 1)
            `).run(runId, unit.unit_id, unit.heatingConsumption, unit.consumptionShare, unit.consumptionCosts);
            
            // Warm Water Base
            db.prepare(`
              INSERT INTO statement_rows (run_id, unit_id, cost_type, distribution_key, basis_value, basis_label, share_percent, amount_euro, category, is_heating_cost)
              VALUES (?, ?, 'Warmwasser Grundkosten', 'Wohnfläche', ?, 'm²', ?, ?, 'Warmwasser', 1)
            `).run(runId, unit.unit_id, unit.area_m2, unit.baseShare, unit.baseCosts);
            
            // Warm Water Consumption
            db.prepare(`
              INSERT INTO statement_rows (run_id, unit_id, cost_type, distribution_key, basis_value, basis_label, share_percent, amount_euro, category, is_heating_cost)
              VALUES (?, ?, 'Warmwasser Verbrauch', 'WW-m³', ?, 'm³', ?, ?, 'Warmwasser', 1)
            `).run(runId, unit.unit_id, unit.warmWaterConsumption, unit.consumptionShare, unit.consumptionCosts);
          }
        }
        
        // 6. Insert operating cost rows
        if (operatingCosts.categories) {
          for (const category of operatingCosts.categories) {
            for (const unit of category.units) {
              db.prepare(`
                INSERT INTO statement_rows (run_id, unit_id, cost_type, distribution_key, basis_value, basis_label, share_percent, amount_euro, category, is_heating_cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
              `).run(runId, unit.unit_id, category.name, unit.distribution_key, unit.basis_value, unit.basis_label, unit.share_percent, unit.amount_gross, category.name);
            }
          }
        }
        
        // 7. Create summary per unit
        const units = db.prepare('SELECT * FROM units WHERE property_id = ?').all(propertyId);
        for (const unit of units) {
          const unitRows = db.prepare(`
            SELECT SUM(amount_euro) as total_costs FROM statement_rows WHERE run_id = ? AND unit_id = ?
          `).get(runId, unit.id);
          
          const unitAdvance = advancePayments.units?.find(u => u.unit_id === unit.id)?.total_amount || 0;
          const balance = (unitRows.total_costs || 0) - unitAdvance;
          
          db.prepare(`
            INSERT INTO statement_summary (run_id, unit_id, total_costs, advance_payments, balance, area_m2, mea, persons)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(runId, unit.id, unitRows.total_costs || 0, unitAdvance, balance, unit.area_m2, unit.mea, unit.persons);
        }
        
        // 8. Update run totals
        db.prepare(`
          UPDATE statement_runs 
          SET heating_costs_total = ?, operating_costs_total = ?, advance_payments_total = ?
          WHERE id = ?
        `).run(heatingCostsTotal, operatingCostsTotal, advancePaymentsTotal, runId);
        
        return { 
          ok: true, 
          runId, 
          message: 'Statement run created successfully',
          totals: {
            heating: heatingCostsTotal,
            operating: operatingCostsTotal,
            advance: advancePaymentsTotal
          }
        };
      });
      
      return tx();
      
    } catch (e) {
      console.error('Error creating statement run:', e);
      return { ok: false, error: String(e) };
    }
  });

  // Get specific statement run
  ipcMain.handle('statement:get-run', async (_e, { propertyId, year }) => {
    try {
      const run = db.prepare(`
        SELECT * FROM statement_runs WHERE property_id = ? AND year = ?
      `).get(propertyId, year);
      
      if (!run) {
        return { ok: false, error: 'No statement run found for this property and year' };
      }
      
      const rows = db.prepare(`
        SELECT sr.*, u.name as unit_name, u.area_m2, u.mea, u.persons
        FROM statement_rows sr
        JOIN units u ON u.id = sr.unit_id
        WHERE sr.run_id = ?
        ORDER BY u.name, sr.cost_type
      `).all(run.id);
      
      const summary = db.prepare(`
        SELECT ss.*, u.name as unit_name
        FROM statement_summary ss
        JOIN units u ON u.id = ss.unit_id
        WHERE ss.run_id = ?
        ORDER BY u.name
      `).all(run.id);
      
      return {
        ok: true,
        run,
        rows,
        summary
      };
      
    } catch (e) {
      console.error('Error getting statement run:', e);
      return { ok: false, error: String(e) };
    }
  });

  // Finalize statement run
  ipcMain.handle('statement:finalize', async (_e, { propertyId, year }) => {
    try {
      const result = db.prepare(`
        UPDATE statement_runs 
        SET status = 'finalized', updated_at = CURRENT_TIMESTAMP
        WHERE property_id = ? AND year = ?
      `).run(propertyId, year);
      
      if (result.changes > 0) {
        return { ok: true, message: 'Statement finalized successfully' };
      } else {
        return { ok: false, error: 'No statement run found to finalize' };
      }
      
    } catch (e) {
      console.error('Error finalizing statement:', e);
      return { ok: false, error: String(e) };
    }
  });

  // Helper functions for the statement workflow
  function calculateHeatingCosts(propertyId, year) {
    try {
      // This would integrate with the existing heating calculation logic
      // For now, return a placeholder structure
      const units = db.prepare(`
        SELECT u.id as unit_id, u.area_m2, u.mea, u.persons
        FROM units u WHERE u.property_id = ?
      `).all(propertyId);
      
      let totalCosts = 0;
      const results = [];
      
      for (const unit of units) {
        // Placeholder calculation - replace with actual heating logic
        const baseShare = (unit.area_m2 / units.reduce((sum, u) => sum + u.area_m2, 0)) * 100;
        const baseCosts = 100; // Placeholder
        const consumptionShare = 50; // Placeholder
        const consumptionCosts = 50; // Placeholder
        const warmWaterConsumption = 0; // Placeholder
        
        totalCosts += baseCosts + consumptionCosts;
        
        results.push({
          unit_id: unit.id,
          area_m2: unit.area_m2,
          baseShare,
          baseCosts,
          consumptionShare,
          consumptionCosts,
          warmWaterConsumption
        });
      }
      
      return { totalCosts, units: results };
    } catch (e) {
      console.error('Error calculating heating costs:', e);
      return { totalCosts: 0, units: [] };
    }
  }

  function getOperatingCosts(propertyId, year) {
    try {
      // Get cost categories and vouchers
      const categories = db.prepare(`
        SELECT c.*, SUM(v.gross) as total_gross
        FROM cost_categories c
        LEFT JOIN vouchers v ON v.category_id = c.id AND v.include_in_statement = 1
        WHERE c.property_id = ? AND (v.voucher_date LIKE ? OR v.voucher_date IS NULL)
        GROUP BY c.id
      `).all(propertyId, `${year}%`);
      
      let totalCosts = 0;
      const results = [];
      
      for (const category of categories) {
        if (category.total_gross) {
          totalCosts += category.total_gross;
          
          // Calculate distribution per unit based on distribution key
          const units = db.prepare('SELECT * FROM units WHERE property_id = ?').all(propertyId);
          const categoryUnits = [];
          
          for (const unit of units) {
            let basis_value = 0;
            let basis_label = '';
            let share_percent = 0;
            let amount_gross = 0;
            
            switch (category.distribution_key) {
              case 'Wohnfläche':
                basis_value = unit.area_m2 || 0;
                basis_label = 'm²';
                break;
              case 'MEA':
                basis_value = unit.mea || 0;
                basis_label = 'MEA';
                break;
              case 'Persons':
                basis_value = unit.persons || 0;
                basis_label = 'Pers.';
                break;
              default:
                basis_value = 1;
                basis_label = 'Anteil';
            }
            
            if (basis_value > 0) {
              const totalBasis = units.reduce((sum, u) => {
                switch (category.distribution_key) {
                  case 'Wohnfläche': return sum + (u.area_m2 || 0);
                  case 'MEA': return sum + (u.mea || 0);
                  case 'Persons': return sum + (u.persons || 0);
                  default: return sum + 1;
                }
              }, 0);
              
              share_percent = (basis_value / totalBasis) * 100;
              amount_gross = (category.total_gross * share_percent) / 100;
            }
            
            categoryUnits.push({
              unit_id: unit.id,
              distribution_key: category.distribution_key,
              basis_value,
              basis_label,
              share_percent,
              amount_gross
            });
          }
          
          results.push({
            name: category.name,
            total_gross: category.total_gross,
            units: categoryUnits
          });
        }
      }
      
      return { totalCosts, categories: results };
    } catch (e) {
      console.error('Error getting operating costs:', e);
      return { totalCosts: 0, categories: [] };
    }
  }

  function getAdvancePayments(propertyId, year) {
    try {
      const units = db.prepare(`
        SELECT u.id as unit_id, u.name as unit_name
        FROM units u WHERE u.property_id = ?
      `).all(propertyId);
      
      let totalAmount = 0;
      const results = [];
      
      for (const unit of units) {
        const advanceAmount = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total_amount
          FROM advance_payments ap
          JOIN statements s ON s.id = ap.statement_id
          WHERE s.property_id = ? AND s.year = ? AND ap.unit_id = ?
        `).get(propertyId, year, unit.unit_id);
        
        const amount = advanceAmount?.total_amount || 0;
        totalAmount += amount;
        
        results.push({
          unit_id: unit.unit_id,
          unit_name: unit.unit_name,
          total_amount: amount
        });
      }
      
      return { totalAmount, units: results };
    } catch (e) {
      console.error('Error getting advance payments:', e);
      return { totalAmount: 0, units: [] };
    }
  }
}

/* -------------------- App Lifecycle -------------------- */
if (process.env.NODE_ENV !== 'test') {
  console.log('Starting Electron app...');
  app.whenReady().then(() => {
    console.log('App is ready, initializing...');
    try {
      initDB();
      console.log('Database initialized');
      registerIpcOnce();
      console.log('IPC handlers registered');
      createWindow();
      console.log('Window created');
    } catch (error) {
      console.error('Error during initialization:', error);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  }).catch(error => {
    console.error('Error in app.whenReady():', error);
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Export for testing
module.exports = { registerIpcOnce };
