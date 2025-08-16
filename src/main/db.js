const sqlite3 = require("sqlite3");

sqlite3.verbose();

let dbInstance = null;

/**
 * Öffnet die Datenbank als Singleton
 */
const getDb = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const { app } = require('electron');
    const path = require('path');
    const fs = require('fs');

    const dbDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    const dbPath = path.join(dbDir, 'belege.db');
    const firstTime = !fs.existsSync(dbPath);
    
    dbInstance = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Tabellen erstellen, falls es das erste Mal ist
      if (firstTime) {
        createTables(dbInstance)
          .then(() => {
            console.log('Datenbank-Tabellen erfolgreich erstellt');
            resolve(dbInstance);
          })
          .catch(reject);
      } else {
        resolve(dbInstance);
      }
    });
  });
};

/**
 * Erstellt die erforderlichen Tabellen
 */
async function createTables(db) {
  return new Promise((resolve, reject) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS kostenarten (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS belege (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        datum TEXT NOT NULL,
        betrag REAL NOT NULL,
        kostenartId INTEGER NOT NULL,
        verwendungszweck TEXT NOT NULL,
        belegnummer TEXT,
        notizen TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kostenartId) REFERENCES kostenarten(id)
      );
    `, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Dummy-Kostenarten einfügen, falls die Tabelle leer ist
      insertDummyKostenarten(db)
        .then(() => resolve())
        .catch(reject);
    });
  });
}

/**
 * Fügt Dummy-Kostenarten ein, falls die Tabelle leer ist
 */
async function insertDummyKostenarten(db) {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM kostenarten", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row.count === 0) {
        db.exec(`
          INSERT INTO kostenarten (name) VALUES 
            ('Hausstrom'),
            ('Grundsteuer'),
            ('Versicherung'),
            ('Hausmeister'),
            ('Müllabfuhr'),
            ('Wartung')
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Dummy-Kostenarten erfolgreich eingefügt');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

/**
 * Führt eine SQL-Anweisung aus (INSERT, UPDATE, DELETE)
 */
const run = (sql, params = []) => {
  return new Promise(async (resolve, reject) => {
    const db = await getDb();
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        changes: this.changes,
        lastID: this.lastID
      });
    });
  });
};

/**
 * Holt eine einzelne Zeile aus der Datenbank
 */
const get = (sql, params = []) => {
  return new Promise(async (resolve, reject) => {
    const db = await getDb();
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
};

/**
 * Holt alle Zeilen aus der Datenbank
 */
const all = (sql, params = []) => {
  return new Promise(async (resolve, reject) => {
    const db = await getDb();
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

module.exports = { getDb, run, get, all };
