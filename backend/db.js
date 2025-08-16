// backend/db.js
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR = path.join(process.env.APPDATA || process.env.HOME || __dirname, 'Hausverwaltung');
const DB_FILE = path.join(DB_DIR, 'hausverwaltung.sqlite');

let db;

function initDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      street TEXT, zip TEXT, city TEXT
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY,
      property_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      area_m2 REAL,
      mea REAL,
      occupant_name TEXT,
      occupant_type TEXT CHECK(occupant_type IN ('Mieter','Eigentümer')) DEFAULT 'Eigentümer',
      email TEXT, phone TEXT,
      move_in TEXT, move_out TEXT,
      FOREIGN KEY(property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS meters (
      id INTEGER PRIMARY KEY,
      unit_id INTEGER,            -- null => Hauszähler
      property_id INTEGER NOT NULL,
      number TEXT,
      label TEXT,
      type TEXT,                  -- z.B. "Kaltwasser", "Warmwasser", "Strom", "WMZ"
      location TEXT,
      unit TEXT,                  -- m³, kWh, MWh
      FOREIGN KEY(unit_id) REFERENCES units(id),
      FOREIGN KEY(property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS meter_readings (
      id INTEGER PRIMARY KEY,
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
  `);

  // Seed nur beim ersten Start (wenn noch keine property existiert)
  const hasAny = db.prepare('SELECT COUNT(*) AS c FROM properties').get().c > 0;
  if (!hasAny) {
    const tx = db.transaction(() => {
      const propertyStmt = db.prepare(`
        INSERT INTO properties (name, street, zip, city) VALUES (@name, @street, @zip, @city)
      `);
      const { lastInsertRowid: pid } = propertyStmt.run({
        name: 'WEG Stuttgarter Straße',
        street: 'Stuttgarter Str. 104',
        zip: '71229',
        city: 'Leonberg'
      });

      const unitStmt = db.prepare(`
        INSERT INTO units (property_id, name, area_m2, occupant_name, occupant_type, move_in)
        VALUES (@property_id, @name, @area_m2, @occupant_name, @occupant_type, @move_in)
      `);

      // Werte aus deiner Mieteraufstellung (Aug 2025)
      unitStmt.run({ property_id: pid, name: 'Wohnung Müller unten Nr. 1', area_m2: 98.60,  occupant_name: 'Jürgen Müller', occupant_type: 'Mieter', move_in: '2000-01-01' });
      unitStmt.run({ property_id: pid, name: 'Wohnung Klee unten Nr. 2',  area_m2: 101.59, occupant_name: 'Rudolf Klee',  occupant_type: 'Eigentümer', move_in: '2000-01-01' });
      unitStmt.run({ property_id: pid, name: 'Wohnung Klee vermietet Nr. 3', area_m2: 135.58, occupant_name: 'Amerika', occupant_type: 'Mieter', move_in: '2000-01-01' });
      unitStmt.run({ property_id: pid, name: 'Wohnung Klee oben Nr. 4',   area_m2: 137.45, occupant_name: 'Rudolf Klee',  occupant_type: 'Eigentümer', move_in: '2000-01-01' });

      // Beispiel: Hauszähler Strom + WMZ (kannst du später erweitern)
      const meterStmt = db.prepare(`
        INSERT INTO meters (unit_id, property_id, number, label, type, location, unit)
        VALUES (@unit_id, @property_id, @number, @label, @type, @location, @unit)
      `);
      meterStmt.run({ unit_id: null, property_id: pid, number: '4336128', label: 'Allgemein Strom', type: 'Strom', location: 'Stromkasten', unit: 'kWh' });
      meterStmt.run({ unit_id: null, property_id: pid, number: '6ZRI8810523269', label: 'Wärmemengenzähler Allgemein', type: 'WMZ', location: 'Keller', unit: 'MWh' });
    });
    tx();
  }

  return db;
}

/* Convenience-APIs für IPC */
const api = {
  getOverview() {
    const p = db.prepare('SELECT * FROM properties LIMIT 1').get();
    const units = db.prepare('SELECT * FROM units WHERE property_id = ? ORDER BY name').all(p.id);
    return { property: p, units };
  },
  listMeters(propertyId) {
    return db.prepare(`
      SELECT m.*, u.name AS unit_name
      FROM meters m
      LEFT JOIN units u ON u.id = m.unit_id
      WHERE m.property_id = ?
      ORDER BY CASE WHEN unit_id IS NULL THEN 0 ELSE 1 END, unit_name, label
    `).all(propertyId);
  },
  saveReading({ meterId, periodStart, periodEnd, start_value, end_value, consumption, note }) {
    // Konsum berechnen falls nicht mitgegeben
    let cons = consumption;
    if (cons == null && start_value != null && end_value != null) cons = parseFloat((end_value - start_value).toFixed(2));
    return db.prepare(`
      INSERT INTO meter_readings (meter_id, period_start, period_end, start_value, end_value, consumption, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(meterId, periodStart, periodEnd, start_value ?? null, end_value ?? null, cons ?? null, note ?? null);
  },
  getReadingsForPeriod(propertyId, from, to) {
    return db.prepare(`
      SELECT m.id AS meter_id, m.number, m.label, m.type, m.unit, u.name AS unit_name,
             r.period_start, r.period_end, r.start_value, r.end_value, r.consumption, r.note
      FROM meters m
      LEFT JOIN units u ON u.id = m.unit_id
      LEFT JOIN meter_readings r ON r.meter_id = m.id AND r.period_start BETWEEN ? AND ?
      WHERE m.property_id = ?
      ORDER BY unit_name, m.label, r.period_start
    `).all(from, to, propertyId);
  },
  listReadings({ meterId, from, to, page = 1, pageSize = 50 } = {}) {
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
  },
  updateReading(id, patch) {
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
  },
  deleteReading(id) {
    const result = db.prepare('DELETE FROM meter_readings WHERE id = ?').run(id);
    return { ok: true, changes: result.changes };
  }
};

module.exports = { initDb, api, DB_FILE };
