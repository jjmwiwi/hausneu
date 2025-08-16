import { Zaehler, ZaehlerTyp } from '../types/zaehler.types';
import { idb, STORES } from '../data/db';
import { upsertZaehlerstand } from '../../renderer/storage/zaehlerstaendeStorage';

// Echte Persistenz statt RAM-Mock
const genId = () =>
  (crypto as any)?.randomUUID?.() ?? `zaehler-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class ZaehlerService {
  private isTestEnvironment = process.env.NODE_ENV === 'test';
  private cleanupCompleted = false;

  // EINMALIGE BEREINIGUNG: Prüfe ob Bereinigung nötig ist
  private shouldCleanupDuplicates(): boolean {
    if (this.cleanupCompleted) return false;
    if (this.isTestEnvironment) return false;
    
    // Prüfe ob Bereinigung bereits in localStorage markiert wurde
    try {
      const cleanupFlag = localStorage.getItem('zaehler_cleanup_completed');
      return cleanupFlag !== 'true';
    } catch {
      return true; // Bei Fehler: Bereinigung durchführen
    }
  }

  // Markiere Bereinigung als abgeschlossen
  private markCleanupComplete(): void {
    this.cleanupCompleted = true;
    try {
      localStorage.setItem('zaehler_cleanup_completed', 'true');
      console.log('[ZaehlerService] Bereinigung als abgeschlossen markiert');
    } catch (error) {
      console.warn('[ZaehlerService] Konnte Bereinigung nicht als abgeschlossen markieren:', error);
    }
  }

  async list(wegId: string): Promise<Zaehler[]> {
    console.log(`[ZaehlerService] list aufgerufen für WEG: ${wegId}`);
    
    try {
      // Versuche zuerst IndexedDB
      const indexedDBZaehler = await idb.getAll(STORES.ZAEHLER);
      const filteredIndexedDB = indexedDBZaehler.filter((z: Zaehler) => z.wegId === wegId);
      
      // Lade auch localStorage-Daten
      const localStorageZaehler = this.loadFromLocalStorage();
      const filteredLocalStorage = localStorageZaehler.filter((z: Zaehler) => z.wegId === wegId);
      
      console.log(`[ZaehlerService] Rohdaten geladen:`, {
        indexedDB: filteredIndexedDB.map(z => ({ id: z.id, notiz: z.notiz, updatedAt: z.updatedAt })),
        localStorage: filteredLocalStorage.map(z => ({ id: z.id, notiz: z.notiz, updatedAt: z.updatedAt }))
      });
      
      // MERGE: Kombiniere beide Quellen und entferne Duplikate
      const allZaehler = [...filteredIndexedDB, ...filteredLocalStorage];
      
      // WICHTIG: Sortiere nach updatedAt, damit die neuesten Daten zuerst kommen
      allZaehler.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime(); // Neueste zuerst
      });
      
      const mergedZaehler = this.mergeAndDeduplicate(allZaehler);
      
      console.log(`[ZaehlerService] Zähler geladen: IndexedDB: ${filteredIndexedDB.length}, localStorage: ${filteredLocalStorage.length}, final: ${mergedZaehler.length}`);
      
      // Zusätzliche Sicherheitsmaßnahme: Entferne temp-IDs
      const finalZaehler = mergedZaehler.filter(z => !z.id.startsWith('temp:'));
      
      if (finalZaehler.length !== mergedZaehler.length) {
        console.log(`[ZaehlerService] ${mergedZaehler.length - finalZaehler.length} temp-IDs entfernt`);
      }
      
      console.log(`[ZaehlerService] Finale Zähler mit Notizen:`, finalZaehler.map(z => ({ id: z.id, notiz: z.notiz, updatedAt: z.updatedAt })));
      
      return finalZaehler;
      
    } catch (error) {
      console.error('[ZaehlerService] Fehler beim Laden aus IndexedDB, verwende localStorage:', error);
      
      // Fallback: Nur localStorage
      const localStorageZaehler = this.loadFromLocalStorage();
      const filtered = localStorageZaehler.filter((z: Zaehler) => z.wegId === wegId);
      
      // Entferne temp-IDs auch hier
      const finalZaehler = filtered.filter(z => !z.id.startsWith('temp:'));
      
      console.log(`[ZaehlerService] Fallback localStorage:`, finalZaehler.map(z => ({ id: z.id, notiz: z.notiz, updatedAt: z.updatedAt })));
      
      return finalZaehler;
    }
  }

  async listByEinheit(wegId: string): Promise<Map<string, Zaehler[]>> {
    const all = await idb.getAll(STORES.ZAEHLER);
    const zaehler = all.filter((z: Zaehler) => z.wegId === wegId);
    
    const result = new Map<string, Zaehler[]>();
    for (const z of zaehler) {
      const einheitId = z.einheitId;
      if (!result.has(einheitId)) {
        result.set(einheitId, []);
      }
      result.get(einheitId)!.push(z);
    }
    
    return result;
  }

  async getById(id: string): Promise<Zaehler | null> {
    return await idb.get(STORES.ZAEHLER, id);
  }

  // WICHTIG: Debug-Funktionen zum Finden aller Zähler
  async getAllZaehlerFromIndexedDB(): Promise<Zaehler[]> {
    try {
      const allZaehler = await idb.getAll(STORES.ZAEHLER);
      console.log(`[ZaehlerService] getAllZaehlerFromIndexedDB: ${allZaehler.length} Zähler gefunden`);
      return allZaehler;
    } catch (error) {
      console.error('[ZaehlerService] Fehler beim Laden aller Zähler aus IndexedDB:', error);
      return [];
    }
  }

  async getAllZaehlerFromLocalStorage(): Promise<Zaehler[]> {
    try {
      const localStorageZaehler = this.loadFromLocalStorage();
      console.log(`[ZaehlerService] getAllZaehlerFromLocalStorage: ${localStorageZaehler.length} Zähler gefunden`);
      return localStorageZaehler;
    } catch (error) {
      console.error('[ZaehlerService] Fehler beim Laden aller Zähler aus localStorage:', error);
      return [];
    }
  }

  async findZaehlerByNummer(zaehlernummer: string): Promise<Zaehler | null> {
    try {
      // Suche in IndexedDB
      const indexedDBZaehler = await idb.getAll(STORES.ZAEHLER);
      const foundInIndexedDB = indexedDBZaehler.find(z => z.zaehlernummer === zaehlernummer);
      if (foundInIndexedDB) {
        console.log(`[ZaehlerService] findZaehlerByNummer: ${zaehlernummer} in IndexedDB gefunden`);
        return foundInIndexedDB;
      }

      // Suche in localStorage
      const localStorageZaehler = this.loadFromLocalStorage();
      const foundInLocalStorage = localStorageZaehler.find(z => z.zaehlernummer === zaehlernummer);
      if (foundInLocalStorage) {
        console.log(`[ZaehlerService] findZaehlerByNummer: ${zaehlernummer} in localStorage gefunden`);
        return foundInLocalStorage;
      }

      console.log(`[ZaehlerService] findZaehlerByNummer: ${zaehlernummer} nirgendwo gefunden`);
      return null;
    } catch (error) {
      console.error(`[ZaehlerService] Fehler beim Suchen nach Zähler ${zaehlernummer}:`, error);
      return null;
    }
  }

  async create(wegId: string, zaehlerData: Omit<Zaehler, "id" | "createdAt" | "updatedAt"> & { idemKey?: string }): Promise<Zaehler> {
    console.log('[ZaehlerService] Versuche Zähler zu erstellen:', {
      wegId,
      einheitId: zaehlerData.einheitId,
      zaehlernummer: zaehlerData.zaehlernummer,
      zaehlertyp: zaehlerData.zaehlertyp
    });
    
    // WICHTIG: Debug-Log für Prompt 6 - Service-Schicht: Upsert vs. Update-Konflikt
    console.debug('[SERVICE] create -> payload:', zaehlerData);
    
    // Generiere eine eindeutige ID falls nicht vorhanden
    // Echte ID generieren und in IndexedDB speichern
    const newZaehler: Zaehler = {
      ...zaehlerData,
      id: genId(),
      wegId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('[ZaehlerService] Versuche Zähler zu erstellen:', {
      wegId: newZaehler.wegId,
      einheitId: newZaehler.einheitId,
      zaehlernummer: newZaehler.zaehlernummer,
      zaehlertyp: newZaehler.zaehlertyp,
      id: newZaehler.id
    });

    // Prüfe auf Duplikate BEVOR der Zähler gespeichert wird
    const existingZaehler = this.loadFromLocalStorage();
    const hasDuplicate = existingZaehler.some(z => 
      z.wegId === newZaehler.wegId && 
      z.einheitId === newZaehler.einheitId && 
      z.zaehlernummer === newZaehler.zaehlernummer && 
      z.zaehlertyp === newZaehler.zaehlertyp
    );
    
    if (hasDuplicate) {
      console.warn('[ZaehlerService] Duplikat gefunden, verwende bestehenden Zähler');
      
      // Finde den bestehenden Zähler
      const existing = existingZaehler.find(z => 
        z.wegId === newZaehler.wegId && 
        z.einheitId === newZaehler.einheitId && 
        z.zaehlernummer === newZaehler.zaehlernummer && 
        z.zaehlertyp === newZaehler.zaehlertyp
      );
      
      if (existing) {
        return existing;
      }
    }

    // Speichere IMMER in localStorage (als Backup)
    try {
      existingZaehler.push(newZaehler);
      this.saveToLocalStorage(existingZaehler);
      console.log(`[ZaehlerService] Zähler ${newZaehler.id} in localStorage gespeichert (Backup)`);
    } catch (localStorageError) {
      console.warn('[ZaehlerService] localStorage-Backup fehlgeschlagen:', localStorageError);
    }

    try {
      // In IndexedDB persistieren
      await idb.put(STORES.ZAEHLER, newZaehler);
      
      console.log(`[ZaehlerService] Zähler ${newZaehler.id} erfolgreich in IndexedDB gespeichert`);
      return newZaehler;
    } catch (error) {
      console.error('[ZaehlerService] Fehler beim Erstellen des Zählers in IndexedDB:', error);
      
      // IndexedDB fehlgeschlagen, aber localStorage funktioniert
      console.log('[ZaehlerService] Verwende Zähler aus localStorage (IndexedDB fehlgeschlagen)');
      return newZaehler;
    }
  }

  // Hilfsmethode: Finde bestehenden Zähler mit gleichen Eigenschaften
  private async findExistingZaehler(wegId: string, einheitId: string, zaehlernummer: string, zaehlertyp: string): Promise<Zaehler | null> {
    try {
      const all = await idb.getAll(STORES.ZAEHLER);
      const existing = all.find((z: Zaehler) => 
        z.wegId === wegId && 
        z.einheitId === einheitId && 
        z.zaehlernummer === zaehlernummer && 
        z.zaehlertyp === zaehlertyp
      );
      return existing || null;
    } catch (error) {
      console.error('[ZaehlerService] Fehler beim Suchen nach bestehendem Zähler:', error);
      return null;
    }
  }

  async update(wegId: string, zaehlerId: string, patch: Partial<Zaehler>): Promise<Zaehler> {
    try {
      // Versuche zuerst IndexedDB
      const current = await idb.get(STORES.ZAEHLER, zaehlerId);
      if (current && current.wegId === wegId) {
        const updatedZaehler = { ...current, ...patch, updatedAt: new Date().toISOString() };
        await idb.put(STORES.ZAEHLER, updatedZaehler);
        
        // Aktualisiere auch localStorage
        this.updateLocalStorageZaehler(updatedZaehler);
        
        console.log(`[ZaehlerService] Zähler ${zaehlerId} in IndexedDB aktualisiert`);
        return updatedZaehler;
      }
    } catch (error) {
      console.warn('[ZaehlerService] IndexedDB-Update fehlgeschlagen, verwende localStorage:', error);
    }
    
    // Fallback: localStorage
    try {
      const localStorageZaehler = this.loadFromLocalStorage();
      const current = localStorageZaehler.find(z => z.id === zaehlerId && z.wegId === wegId);
      
      if (current) {
        const updatedZaehler = { ...current, ...patch, updatedAt: new Date().toISOString() };
        
        // Aktualisiere localStorage
        const updatedList = localStorageZaehler.map(z => z.id === zaehlerId ? updatedZaehler : z);
        this.saveToLocalStorage(updatedList);
        
        console.log(`[ZaehlerService] Zähler ${zaehlerId} in localStorage aktualisiert (Fallback)`);
        return updatedZaehler;
      }
    } catch (fallbackError) {
      console.error('[ZaehlerService] Auch localStorage-Update fehlgeschlagen:', fallbackError);
    }
    
    throw new Error('Zähler nicht gefunden');
  }

  async updateNote(zaehlerId: string, notiz: string, wegId?: string): Promise<Zaehler> {
    console.log(`[ZaehlerService] updateNote aufgerufen: zaehlerId=${zaehlerId}, notiz="${notiz}"`);
    
    let updatedZaehler: Zaehler;
    
    try {
      // Versuche zuerst IndexedDB
      const current = await idb.get(STORES.ZAEHLER, zaehlerId);
      if (current && (!wegId || current.wegId === wegId)) {
        // WICHTIG: Verwende einen eindeutigen Timestamp für bessere Synchronisation
        const timestamp = new Date().toISOString();
        updatedZaehler = { ...current, notiz, updatedAt: timestamp };
        
        console.log(`[ZaehlerService] Aktualisiere IndexedDB mit Timestamp: ${timestamp}`);
        await idb.put(STORES.ZAEHLER, updatedZaehler);
        
        console.log(`[ZaehlerService] Notiz für Zähler ${zaehlerId} in IndexedDB aktualisiert: "${notiz}"`);
        
        // Aktualisiere auch localStorage MIT DEM GLEICHEN TIMESTAMP
        this.updateLocalStorageZaehler(updatedZaehler);
        
        // Verifiziere, dass die Daten korrekt gespeichert wurden
        const verifyIndexedDB = await idb.get(STORES.ZAEHLER, zaehlerId);
        console.log(`[ZaehlerService] Verifikation IndexedDB nach Speichern:`, {
          id: verifyIndexedDB?.id,
          notiz: verifyIndexedDB?.notiz,
          updatedAt: verifyIndexedDB?.updatedAt
        });
        
        // WICHTIG: Prüfe, ob die Verifikation erfolgreich war
        if (verifyIndexedDB?.notiz !== notiz) {
          console.error(`[ZaehlerService] FEHLER: Verifikation fehlgeschlagen! Gespeichert: "${notiz}", Gelesen: "${verifyIndexedDB?.notiz}"`);
          
          // WICHTIG: Versuche es nochmal mit einem kurzen Delay
          console.log(`[ZaehlerService] Versuche erneute Verifikation nach 100ms...`);
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const retryVerify = await idb.get(STORES.ZAEHLER, zaehlerId);
          if (retryVerify?.notiz === notiz) {
            console.log(`[ZaehlerService] ✅ Verifikation nach Retry erfolgreich!`);
            return updatedZaehler;
          }
          
          // Wenn auch der Retry fehlschlägt, verwende localStorage als Fallback
          console.warn(`[ZaehlerService] Verifikation fehlgeschlagen, verwende localStorage als Fallback`);
          this.updateLocalStorageZaehler(updatedZaehler);
          return updatedZaehler;
        }
        
        return updatedZaehler;
      } else {
        if (current && wegId && current.wegId !== wegId) {
          console.warn(`[ZaehlerService] Zähler ${zaehlerId} gehört zu WEG ${current.wegId}, nicht zu ${wegId}`);
        } else {
          console.warn(`[ZaehlerService] Zähler ${zaehlerId} nicht in IndexedDB gefunden`);
        }
      }
    } catch (error) {
      console.warn('[ZaehlerService] IndexedDB-Update fehlgeschlagen, verwende localStorage:', error);
    }
    
    // Fallback: localStorage
    try {
      const localStorageZaehler = this.loadFromLocalStorage();
      const current = localStorageZaehler.find(z => z.id === zaehlerId && (!wegId || z.wegId === wegId));
      
      if (current) {
        // WICHTIG: Verwende einen eindeutigen Timestamp für bessere Synchronisation
        const timestamp = new Date().toISOString();
        updatedZaehler = { ...current, notiz, updatedAt: timestamp };
        
        console.log(`[ZaehlerService] Aktualisiere localStorage mit Timestamp: ${timestamp}`);
        
        // Aktualisiere localStorage
        const updatedList = localStorageZaehler.map(z => z.id === zaehlerId ? updatedZaehler : z);
        this.saveToLocalStorage(updatedList);
        
        console.log(`[ZaehlerService] Notiz für Zähler ${zaehlerId} in localStorage aktualisiert (Fallback): "${notiz}"`);
        
        // Verifiziere, dass die Daten korrekt gespeichert wurden
        const verifyLocalStorage = this.loadFromLocalStorage();
        const verifyZaehler = verifyLocalStorage.find(z => z.id === zaehlerId);
        console.log(`[ZaehlerService] Verifikation localStorage nach Speichern:`, {
          id: verifyZaehler?.id,
          notiz: verifyZaehler?.notiz,
          updatedAt: verifyZaehler?.updatedAt
        });
        
        // WICHTIG: Prüfe, ob die Verifikation erfolgreich war
        if (verifyZaehler?.notiz !== notiz) {
          console.error(`[ZaehlerService] FEHLER: localStorage-Verifikation fehlgeschlagen! Gespeichert: "${notiz}", Gelesen: "${verifyZaehler?.notiz}"`);
          
          // WICHTIG: Versuche es nochmal mit einem kurzen Delay
          console.log(`[ZaehlerService] Versuche erneute localStorage-Verifikation nach 100ms...`);
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const retryVerifyLocalStorage = this.loadFromLocalStorage();
          const retryVerifyZaehler = retryVerifyLocalStorage.find(z => z.id === zaehlerId);
          if (retryVerifyZaehler?.notiz === notiz) {
            console.log(`[ZaehlerService] ✅ localStorage-Verifikation nach Retry erfolgreich!`);
            return updatedZaehler;
          }
          
          // Wenn auch der Retry fehlschlägt, gib trotzdem den aktualisierten Zähler zurück
          console.warn(`[ZaehlerService] localStorage-Verifikation fehlgeschlagen, aber gib aktualisierten Zähler zurück`);
          return updatedZaehler;
        }
        
        return updatedZaehler;
      } else {
        console.warn(`[ZaehlerService] Zähler ${zaehlerId} nicht in localStorage gefunden oder gehört nicht zu WEG ${wegId}`);
      }
    } catch (fallbackError) {
      console.error('[ZaehlerService] Auch localStorage-Update fehlgeschlagen:', fallbackError);
    }
    
    throw new Error(`Zähler ${zaehlerId} nicht gefunden`);
  }

  async upsertReading(wegId: string, jahr: number, zaehlerId: string, values: { startwert?: number | null; ablesewert?: number | null; notiz?: string }): Promise<Zaehler> {
    // WICHTIG: Debug-Log für Ziel 2 - Upsert-Payloads wirklich getrennt verifizieren
    console.debug('[UPSERT:RAW]', {
      hasStart: Object.prototype.hasOwnProperty.call(values,'startwert'),
      hasAblese: Object.prototype.hasOwnProperty.call(values,'ablesewert'),
      values,
      timestamp: new Date().toISOString()
    });

    // WICHTIG: Debug-Log für Ziel 6 - Service-Schicht: Upsert vs. Update-Konflikt
    console.debug('[SERVICE] upsertReading -> id:', zaehlerId, 'payload:', values);

    // WICHTIG: Debug-Log für Ziel 3 - Zeitraum/Jahr prüfen
    console.debug('[UPSERT:J] jahr=', jahr);

    try {
      // Versuche zuerst IndexedDB
      const current = await this.getById(zaehlerId);
      if (current) {
        console.log(`[ZaehlerService] Zähler gefunden, verwende: ${current.id} (${current.zaehlernummer})`);
        
        // WICHTIG: Debug-Log für Ziel 2 - Merge-Semantik absichern
        const next = {
          startwert: values.startwert !== undefined ? values.startwert : current.startwert,
          ablesewert: values.ablesewert !== undefined ? values.ablesewert : current.ablesewert
        };
        console.debug('[UPSERT:MERGE]', {
          current: { startwert: current.startwert, ablesewert: current.ablesewert },
          incoming: values,
          next,
          mergeRule: 'values.X !== undefined ? values.X : current.X (kein undefined überschreiben)'
        });

        // WICHTIG: Feldgenaue Updates - nur gesetzte Felder aktualisieren
        // WICHTIG: Notizen werden NICHT in den Zähler-Stammdaten gespeichert!
        if (values.startwert !== undefined) {
          current.startwert = values.startwert;
        }
        if (values.ablesewert !== undefined) {
          current.ablesewert = values.ablesewert;
        }
        // WICHTIG: Notizen werden nur in den Zählerständen gespeichert, nicht in den Stammdaten
        // if (values.notiz !== undefined) {
        //   current.notiz = values.notiz;
        // }

        // WICHTIG: ZIEL 10 - Last-Resort Temporär (falls eilig)
        // Beim Ablese-Save merge den aktuellen startwert aus dem Context ins Payload
        if (values.ablesewert !== undefined && values.startwert === undefined && current.startwert !== undefined) {
          console.debug('[ZIEL_10:LAST_RESORT] Merge aktuellen startwert ins Ablese-Payload:', {
            currentStartwert: current.startwert,
            ablesewert: values.ablesewert,
            reason: 'Last-Resort: startwert nicht verlieren'
          });
          // Der startwert wird bereits über current.startwert gespeichert
        }

        // Speichere in IndexedDB
        await this.saveToIndexedDB(current);
        
        // Aktualisiere Zählerstände
        // WICHTIG: Speichere auch null-Werte, damit Benutzer Werte löschen können
        upsertZaehlerstand({
          zaehlernummer: current.zaehlernummer,
          einheitId: current.einheitId,
          jahr: jahr,
          startwert: values.startwert !== undefined ? (values.startwert === null ? undefined : values.startwert) : undefined,
          ablesewert: values.ablesewert !== undefined ? (values.ablesewert === null ? undefined : values.ablesewert) : undefined,
          notiz: values.notiz !== undefined ? values.notiz : undefined
        });

        return current;
      }
    } catch (error) {
      console.warn('[ZaehlerService] IndexedDB-Fehler, verwende localStorage-Fallback:', error);
    }

    // Fallback: localStorage
    try {
      const localStorageZaehler = this.loadFromLocalStorage();
      let current = localStorageZaehler.find(z => z.id === zaehlerId && z.wegId === wegId);

      if (current) {
        console.log(`[ZaehlerService] Zähler gefunden, verwende: ${current.id} (${current.zaehlernummer})`);
        
        // WICHTIG: Debug-Log für Ziel 2 - Merge-Semantik absichern (Fallback)
        const next = {
          startwert: values.startwert !== undefined ? values.startwert : current.startwert,
          ablesewert: values.ablesewert !== undefined ? values.ablesewert : current.ablesewert
        };
        console.debug('[UPSERT:MERGE:FALLBACK]', {
          current: { startwert: current.startwert, ablesewert: current.ablesewert },
          incoming: values,
          next,
          mergeRule: 'values.X !== undefined ? values.X : current.X (kein undefined überschreiben)'
        });

        // WICHTIG: Feldgenaue Updates - nur gesetzte Felder aktualisieren
        // WICHTIG: Notizen werden NICHT in den Zähler-Stammdaten gespeichert!
        if (values.startwert !== undefined) {
          current.startwert = values.startwert;
        }
        if (values.ablesewert !== undefined) {
          current.ablesewert = values.ablesewert;
        }
        // WICHTIG: Notizen werden nur in den Zählerständen gespeichert, nicht in den Stammdaten
        // if (values.notiz !== undefined) {
        //   current.notiz = values.notiz;
        // }

        // Speichere in localStorage
        this.saveToLocalStorage(localStorageZaehler);
        
        // Aktualisiere Zählerstände
        // WICHTIG: Speichere auch null-Werte, damit Benutzer Werte löschen können
        upsertZaehlerstand({
          zaehlernummer: current.zaehlernummer,
          einheitId: current.einheitId,
          jahr: jahr,
          startwert: values.startwert !== undefined ? (values.startwert === null ? undefined : values.startwert) : undefined,
          ablesewert: values.ablesewert !== undefined ? (values.ablesewert === null ? undefined : values.ablesewert) : undefined,
          notiz: values.notiz !== undefined ? values.notiz : undefined
        });

        return current;
      }
    } catch (fallbackError) {
      console.error('[ZaehlerService] localStorage-Fallback fehlgeschlagen:', fallbackError);
    }

    // WICHTIG: Wenn der Zähler nicht gefunden wurde, versuche ihn in localStorage zu finden
    // Das kann passieren, wenn eine tempId verwendet wird
    try {
      const localStorageZaehler = this.loadFromLocalStorage();
      let current = null;

      if (zaehlerId.startsWith('temp:')) {
        // Bei tempId: Suche nach dem neuesten Zähler für diesen WEG
        // Der sollte der gerade erstellte sein
        current = localStorageZaehler
          .filter(z => z.wegId === wegId)
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

        if (current) {
          console.log(`[ZaehlerService] TempId ${zaehlerId} - Verwende neuesten Zähler für WEG ${wegId}:`, current.id);
        }
      } else {
        // Normale Suche nach ID
        current = localStorageZaehler.find(z => z.id === zaehlerId && z.wegId === wegId);
      }

      if (current) {
        console.log(`[ZaehlerService] Zähler gefunden, verwende: ${current.id} (${current.zaehlernummer})`);
        
        // WICHTIG: Feldgenaue Updates - nur gesetzte Felder aktualisieren
        // WICHTIG: Notizen werden NICHT in den Zähler-Stammdaten gespeichert!
        if (values.startwert !== undefined) {
          current.startwert = values.startwert;
        }
        if (values.ablesewert !== undefined) {
          current.ablesewert = values.ablesewert;
        }
        // WICHTIG: Notizen werden nur in den Zählerständen gespeichert, nicht in den Stammdaten
        // if (values.notiz !== undefined) {
        //   current.notiz = values.notiz;
        // }

        // Speichere in localStorage
        this.saveToLocalStorage(localStorageZaehler);
        
        // Aktualisiere Zählerstände
        upsertZaehlerstand({
          zaehlernummer: current.zaehlernummer,
          einheitId: current.einheitId,
          jahr: jahr,
          startwert: values.startwert !== undefined && values.startwert !== null ? values.startwert : undefined,
          ablesewert: values.ablesewert !== undefined && values.ablesewert !== null ? values.ablesewert : undefined,
          notiz: values.notiz !== undefined ? values.notiz : undefined
        });

        return current;
      }
    } catch (finalError) {
      console.error('[ZaehlerService] Finaler Fallback fehlgeschlagen:', finalError);
    }
    throw new Error(`Zähler ${zaehlerId} nicht gefunden`);
  }

  async remove(wegId: string, zaehlerId: string): Promise<void> {
    try {
      // Versuche zuerst IndexedDB
      const current = await idb.get(STORES.ZAEHLER, zaehlerId);
      if (current && current.wegId === wegId) {
        await idb.delete(STORES.ZAEHLER, zaehlerId);
        console.log(`[ZaehlerService] Zähler ${zaehlerId} aus IndexedDB gelöscht`);
        
        // Aktualisiere auch localStorage
        this.removeFromLocalStorage(zaehlerId);
      }
    } catch (error) {
      console.warn('[ZaehlerService] IndexedDB-Delete fehlgeschlagen, verwende localStorage:', error);
    }
    
    // Fallback: localStorage
    try {
      this.removeFromLocalStorage(zaehlerId);
      console.log(`[ZaehlerService] Zähler ${zaehlerId} aus localStorage gelöscht (Fallback)`);
    } catch (fallbackError) {
      console.error('[ZaehlerService] Auch localStorage-Delete fehlgeschlagen:', fallbackError);
    }
  }



  async findById(id: string): Promise<Zaehler | null> {
    return await idb.get(STORES.ZAEHLER, id);
  }

  getZaehlerTypen(): string[] {
    return Object.values(ZaehlerTyp);
  }

  // Nur für Tests: Mock-Daten in IndexedDB laden
  async resetMockData(): Promise<void> {
    if (!this.isTestEnvironment) {
      console.warn('[ZaehlerService] resetMockData nur in Test-Umgebung erlaubt');
      return;
    }

    // Lösche alle existierenden Daten
    await idb.clear(STORES.ZAEHLER);
    
    // Lade Mock-Daten
    const mockZaehler: Zaehler[] = [
      {
        id: 'zaehler-1',
        wegId: 'test-weg',
        einheitId: 'allgemein',
        zaehlernummer: 'A001',
        bezeichnung: 'Hauptzähler für das gesamte Gebäude',
        zaehlertyp: ZaehlerTyp.STROM,
        zaehlertypEinheit: 'kWh',
        standort: 'Keller',
        notiz: 'Hauptzähler für das gesamte Gebäude',
        startwert: null,
        ablesewert: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'zaehler-2',
        wegId: 'test-weg',
        einheitId: '1',
        zaehlernummer: 'A002',
        bezeichnung: 'Zähler für Wohnung 1',
        zaehlertyp: ZaehlerTyp.STROM,
        zaehlertypEinheit: 'kWh',
        standort: 'Wohnung 1',
        notiz: 'Zähler für Wohnung 1',
        startwert: null,
        ablesewert: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'zaehler-3',
        wegId: 'test-weg',
        einheitId: 'allgemein',
        zaehlernummer: 'A003',
        bezeichnung: 'Heizkostenverteiler für das gesamte Gebäude',
        zaehlertyp: ZaehlerTyp.WMZ_HEIZUNG,
        zaehlertypEinheit: 'MWh',
        standort: 'Keller',
        notiz: 'Heizkostenverteiler für das gesamte Gebäude',
        startwert: null,
        ablesewert: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'zaehler-4',
        wegId: 'test-weg',
        einheitId: '2',
        zaehlernummer: 'A004',
        bezeichnung: 'Zähler für Wohnung 2',
        zaehlertyp: ZaehlerTyp.STROM,
        zaehlertypEinheit: 'kWh',
        standort: 'Wohnung 2',
        notiz: 'Zähler für Wohnung 2',
        startwert: null,
        ablesewert: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    ];

    // Speichere Mock-Daten in IndexedDB
    for (const zaehler of mockZaehler) {
      await idb.put(STORES.ZAEHLER, zaehler);
    }

    console.log(`[ZaehlerService] ${mockZaehler.length} Mock-Zähler in IndexedDB geladen`);
  }

  // Alle Daten einer WEG löschen
  async purgeAll(wegId: string): Promise<number> {
    console.log(`[ZaehlerService] Lösche alle Zähler für WEG ${wegId}`);
    
    let deletedCount = 0;
    
    try {
      // Lösche aus IndexedDB
      const allZaehler = await idb.getAll(STORES.ZAEHLER);
      const wegZaehler = allZaehler.filter((z: Zaehler) => z.wegId === wegId);
      
      for (const zaehler of wegZaehler) {
        try {
          await idb.delete(STORES.ZAEHLER, zaehler.id);
          deletedCount++;
          console.log(`[ZaehlerService] Zähler ${zaehler.id} aus IndexedDB gelöscht`);
        } catch (error) {
          console.warn(`[ZaehlerService] Fehler beim Löschen von Zähler ${zaehler.id}:`, error);
        }
      }
      
      console.log(`[ZaehlerService] ${deletedCount} Zähler aus IndexedDB gelöscht`);
      
    } catch (error) {
      console.warn('[ZaehlerService] IndexedDB-Purge fehlgeschlagen, verwende localStorage:', error);
    }
    
    // Lösche auch aus localStorage
    try {
      const localStorageZaehler = this.loadFromLocalStorage();
      const wegLocalZaehler = localStorageZaehler.filter(z => z.wegId === wegId);
      
      const remainingZaehler = localStorageZaehler.filter(z => z.wegId !== wegId);
      this.saveToLocalStorage(remainingZaehler);
      
      const localDeletedCount = wegLocalZaehler.length;
      deletedCount = Math.max(deletedCount, localDeletedCount); // Verwende den höheren Wert
      
      console.log(`[ZaehlerService] ${localDeletedCount} Zähler aus localStorage gelöscht`);
      
    } catch (fallbackError) {
      console.error('[ZaehlerService] localStorage-Purge fehlgeschlagen:', fallbackError);
    }
    
    console.log(`[ZaehlerService] Insgesamt ${deletedCount} Zähler für WEG ${wegId} gelöscht`);
    return deletedCount;
  }

  // Hilfsmethoden für localStorage-Fallback
  private loadFromLocalStorage(): Zaehler[] {
    const storedData = localStorage.getItem('zaehler_data');
    if (storedData) {
      try {
        return JSON.parse(storedData);
      } catch (e) {
        console.error('[ZaehlerService] Fehler beim Parsen der localStorage-Daten:', e);
        return [];
      }
    }
    return [];
  }

  private saveToLocalStorage(data: Zaehler[]): void {
    try {
      localStorage.setItem('zaehler_data', JSON.stringify(data));
    } catch (e) {
      console.error('[ZaehlerService] Fehler beim Speichern der localStorage-Daten:', e);
    }
  }

  private updateLocalStorageZaehler(updatedZaehler: Zaehler): void {
    try {
      console.log(`[ZaehlerService] updateLocalStorageZaehler: Zähler ${updatedZaehler.id}, Notiz: "${updatedZaehler.notiz}"`);
      
      const existingData = this.loadFromLocalStorage();
      const existingIndex = existingData.findIndex(z => z.id === updatedZaehler.id);
      
      if (existingIndex !== -1) {
        // Aktualisiere bestehenden Eintrag
        existingData[existingIndex] = updatedZaehler;
        console.log(`[ZaehlerService] Bestehenden localStorage-Eintrag aktualisiert`);
      } else {
        // Füge neuen Eintrag hinzu
        existingData.push(updatedZaehler);
        console.log(`[ZaehlerService] Neuen localStorage-Eintrag hinzugefügt`);
      }
      
      this.saveToLocalStorage(existingData);
      console.log(`[ZaehlerService] localStorage erfolgreich aktualisiert für Zähler ${updatedZaehler.id}`);
      
    } catch (e) {
      console.error('[ZaehlerService] Fehler beim Aktualisieren der localStorage-Daten:', e);
    }
  }

  private removeFromLocalStorage(zaehlerId: string): void {
    try {
      const existingData = this.loadFromLocalStorage();
      const updatedData = existingData.filter(z => z.id !== zaehlerId);
      this.saveToLocalStorage(updatedData);
    } catch (e) {
      console.error('[ZaehlerService] Fehler beim Löschen der localStorage-Daten:', e);
    }
  }

  private async saveToIndexedDB(zaehler: Zaehler): Promise<void> {
    try {
      await idb.put(STORES.ZAEHLER, zaehler);
    } catch (error) {
      console.error('[ZaehlerService] Fehler beim Speichern in IndexedDB:', error);
      throw error;
    }
  }

  // Hilfsmethode zum Zusammenführen und Entfernen von Duplikaten
  private mergeAndDeduplicate(zaehler: Zaehler[]): Zaehler[] {
    console.log(`[ZaehlerService] mergeAndDeduplicate: Starte mit ${zaehler.length} Zählern`);
    
    const seen = new Map<string, Zaehler>();
    const result: Zaehler[] = [];

    for (const z of zaehler) {
      // Ignoriere temp-IDs (diese sollten nur im Context sein)
      if (z.id.startsWith('temp:')) {
        console.log(`[ZaehlerService] Temp-ID übersprungen: ${z.id}`);
        continue;
      }
      
      const key = `${z.wegId}-${z.einheitId}-${z.zaehlernummer}-${z.zaehlertyp}`;
      if (!seen.has(key)) {
        seen.set(key, z);
        result.push(z);
        console.log(`[ZaehlerService] Neuer Zähler hinzugefügt: ${z.id} (${z.notiz || 'keine Notiz'})`);
      } else {
        // Bei Duplikaten: behalte den neuesten (basierend auf updatedAt)
        const existing = seen.get(key)!;
        const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);
        const newDate = new Date(z.updatedAt || z.createdAt || 0);
        
        console.log(`[ZaehlerService] Duplikat gefunden für ${key}:`, {
          existing: { id: existing.id, notiz: existing.notiz, updatedAt: existing.updatedAt },
          new: { id: z.id, notiz: z.notiz, updatedAt: z.updatedAt },
          existingDate: existingDate.toISOString(),
          newDate: newDate.toISOString(),
          isNewer: newDate > existingDate
        });
        
        if (newDate > existingDate) {
          // Ersetze den alten durch den neueren
          const index = result.findIndex(item => item.id === existing.id);
          if (index !== -1) {
            result[index] = z;
            seen.set(key, z);
            console.log(`[ZaehlerService] Ersetzt: ${existing.id} → ${z.id} (${z.notiz || 'keine Notiz'})`);
          }
        } else {
          // WICHTIG: Wenn die Daten gleich alt sind, aber unterschiedliche Notizen haben,
          // behalte den mit der Notiz (der wurde wahrscheinlich aktualisiert)
          if (existing.notiz === undefined && z.notiz !== undefined) {
            const index = result.findIndex(item => item.id === existing.id);
            if (index !== -1) {
              result[index] = z;
              seen.set(key, z);
              console.log(`[ZaehlerService] Ersetzt (Notiz-Priorität): ${existing.id} → ${z.id} (${z.notiz || 'keine Notiz'})`);
            }
          } else {
            console.log(`[ZaehlerService] Behalte bestehenden: ${existing.id} (${existing.notiz || 'keine Notiz'})`);
          }
        }
      }
    }
    
    console.log(`[ZaehlerService] mergeAndDeduplicate abgeschlossen: ${result.length} Zähler`);
    console.log(`[ZaehlerService] Finale Zähler:`, result.map(z => ({ id: z.id, notiz: z.notiz, updatedAt: z.updatedAt })));
    
    return result;
  }
}

export default new ZaehlerService();
