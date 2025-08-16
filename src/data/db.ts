// src/data/db.ts
// Minimaler IndexedDB Wrapper (keine Fremdbibs nötig)

const DB_NAME = 'hausverwaltung';
const DB_VERSION = 2; // Version erhöht für Schema-Update
const STORE_ZAEHLER = 'zaehler';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
      
      if (!db.objectStoreNames.contains(STORE_ZAEHLER)) {
        const store = db.createObjectStore(STORE_ZAEHLER, { keyPath: 'id' });
        store.createIndex('by_weg', 'wegId', { unique: false });
        store.createIndex('by_einheit', 'einheitId', { unique: false });
        store.createIndex('by_zaehlernummer', 'zaehlernummer', { unique: false });
        store.createIndex('by_zaehlertyp', 'zaehlertyp', { unique: false });
        
        // UNIQUE INDEX: Verhindert zukünftige Duplikate
        // Kombination aus wegId, einheitId, zaehlernummer und zaehlertyp muss eindeutig sein
        // TEMPORÄR: Unique-Index deaktiviert, um das Speicherproblem zu beheben
        // TODO: Nach der Bereinigung wieder auf unique: true setzen
        store.createIndex('unique_zaehler', ['wegId', 'einheitId', 'zaehlernummer', 'zaehlertyp'], { unique: false });
        
        console.log('[IndexedDB] Neue Zähler-Store mit Warn-Index erstellt (unique: false)');
      } else if (oldVersion < 2) {
        // Upgrade von Version 1 auf 2: Unique-Index hinzufügen
        const store = db.transaction(STORE_ZAEHLER, 'readwrite').objectStore(STORE_ZAEHLER);
        
        // Prüfe ob der Index bereits existiert
        if (!store.indexNames.contains('unique_zaehler')) {
          try {
            // TEMPORÄR: Unique-Index deaktiviert, um das Speicherproblem zu beheben
            // TODO: Nach der Bereinigung wieder auf unique: true setzen
            store.createIndex('unique_zaehler', ['wegId', 'einheitId', 'zaehlernummer', 'zaehlertyp'], { unique: false });
            console.log('[IndexedDB] Warn-Index für Zähler hinzugefügt (unique: false)');
          } catch (error) {
            console.warn('[IndexedDB] Warn-Index konnte nicht erstellt werden:', error);
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const p = Promise.resolve(run(store));
    p.then((val) => t.commit?.(), () => t.abort?.());
    t.oncomplete = () => resolve(p as any);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const idb = {
  async getAll(storeName: string) {
    return tx<any[]>(storeName, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async get(storeName: string, id: string) {
    return tx<any>(storeName, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async put(storeName: string, value: any) {
    return tx<void>(storeName, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  },
  async delete(storeName: string, id: string) {
    return tx<void>(storeName, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  },
  async clear(storeName: string) {
    return tx<void>(storeName, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  },
  // NEUE FUNKTION: Bereinigung bestehender Duplikate
  async cleanupDuplicates(storeName: string): Promise<{ removed: number, kept: number, warnings: number }> {
    return tx<{ removed: number, kept: number, warnings: number }>(storeName, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const allItems = req.result || [];
          const duplicates = new Map<string, any[]>();
          let warnings = 0;
          
          // Gruppiere nach dem Unique-Key
          for (const item of allItems) {
            if (item.wegId && item.einheitId && item.zaehlernummer && item.zaehlertyp) {
              const key = `${item.wegId}|${item.einheitId}|${item.zaehlernummer}|${item.zaehlertyp}`;
              if (!duplicates.has(key)) {
                duplicates.set(key, []);
              }
              duplicates.get(key)!.push(item);
            }
          }
          
          let removed = 0;
          let kept = 0;
          
          // Entferne Duplikate, behalte den neuesten (basierend auf updatedAt)
          for (const [key, items] of duplicates) {
            if (items.length > 1) {
              // Sortiere nach updatedAt (neueste zuerst)
              items.sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt || 0);
                const dateB = new Date(b.updatedAt || b.createdAt || 0);
                return dateB.getTime() - dateA.getTime();
              });
              
              // Behalte den ersten (neuesten), entferne den Rest
              const toKeep = items[0];
              const toRemove = items.slice(1);
              
              // Entferne Duplikate
              for (const duplicate of toRemove) {
                store.delete(duplicate.id);
                removed++;
              }
              
              kept++;
              console.log(`[Cleanup] Duplikat entfernt für ${key}, behalten: ${toKeep.id}, entfernt: ${toRemove.length}`);
            } else {
              kept++;
            }
          }
          
          // Warnung für potenzielle Duplikate (da unique: false)
          for (const [key, items] of duplicates) {
            if (items.length > 1) {
              warnings++;
              console.warn(`[Cleanup] WARNUNG: Potenzielle Duplikate gefunden für ${key} (${items.length} Einträge)`);
            }
          }
          
          resolve({ removed, kept, warnings });
        };
        req.onerror = () => reject(req.error);
      });
    });
  },
};

export const STORES = { ZAEHLER: STORE_ZAEHLER };

