import { ipcMain } from "electron";
import { run, get, all } from "../db";

/**
 * Registriert alle IPC-Handler für Belege und Kostenarten
 */
export function registerBelegeHandlers() {
  // Kostenarten auflisten
  ipcMain.handle("kostenarten:list", async () => {
    try {
      return await all("SELECT id, name FROM kostenarten ORDER BY name ASC");
    } catch (error) {
      console.error("Fehler beim Laden der Kostenarten:", error);
      throw error;
    }
  });

  // Belege auflisten
  ipcMain.handle("belege:list", async () => {
    try {
      return await all(`
        SELECT b.*, ka.name AS kostenartName
        FROM belege b 
        LEFT JOIN kostenarten ka ON ka.id = b.kostenartId
        ORDER BY date(b.datum) DESC, b.id DESC
      `);
    } catch (error) {
      console.error("Fehler beim Laden der Belege:", error);
      throw error;
    }
  });

  // Neuen Beleg erstellen
  ipcMain.handle("belege:create", async (_e, p) => {
    try {
      // Basic Validation
      if (!p || typeof p !== "object") {
        throw new Error("Invalid payload");
      }
      
      const { datum, betrag, kostenartId, verwendungszweck, belegnummer, notizen } = p;
      
      if (!datum || !verwendungszweck) {
        throw new Error("Missing required fields");
      }
      
      const betragNum = Number(betrag);
      const kostenartNum = Number(kostenartId);
      
      if (!Number.isFinite(betragNum) || !Number.isFinite(kostenartNum)) {
        throw new Error("Invalid numeric fields");
      }

      // Beleg in Datenbank einfügen
      const result = await run(`
        INSERT INTO belege (datum, betrag, kostenartId, verwendungszweck, belegnummer, notizen)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [datum, betragNum, kostenartNum, verwendungszweck, belegnummer || null, notizen || null]);

      // Den neu erstellten Beleg mit Kostenart-Name zurückgeben
      const row = await get(`
        SELECT b.*, ka.name AS kostenartName
        FROM belege b 
        LEFT JOIN kostenarten ka ON ka.id = b.kostenartId
        WHERE b.id = ?
      `, [result.lastID]);

      return row;
    } catch (error) {
      console.error("Fehler beim Erstellen des Belegs:", error);
      throw error;
    }
  });

  // Beleg aktualisieren
  ipcMain.handle("belege:update", async (_e, p) => {
    try {
      if (!p || typeof p !== "object" || !p.id) {
        throw new Error("Invalid payload or missing ID");
      }
      
      const { id, datum, betrag, kostenartId, verwendungszweck, belegnummer, notizen } = p;
      
      if (!datum || !verwendungszweck) {
        throw new Error("Missing required fields");
      }
      
      const betragNum = Number(betrag);
      const kostenartNum = Number(kostenartId);
      
      if (!Number.isFinite(betragNum) || !Number.isFinite(kostenartNum)) {
        throw new Error("Invalid numeric fields");
      }

      // Beleg aktualisieren
      await run(`
        UPDATE belege 
        SET datum = ?, betrag = ?, kostenartId = ?, verwendungszweck = ?, belegnummer = ?, notizen = ?
        WHERE id = ?
      `, [datum, betragNum, kostenartNum, verwendungszweck, belegnummer || null, notizen || null, id]);

      // Den aktualisierten Beleg zurückgeben
      const row = await get(`
        SELECT b.*, ka.name AS kostenartName
        FROM belege b 
        LEFT JOIN kostenarten ka ON ka.id = b.kostenartId
        WHERE b.id = ?
      `, [id]);

      return row;
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Belegs:", error);
      throw error;
    }
  });

  // Beleg löschen
  ipcMain.handle("belege:delete", async (_e, id) => {
    try {
      if (!id) {
        throw new Error("Missing ID");
      }

      const result = await run("DELETE FROM belege WHERE id = ?", [id]);
      
      if (result.changes === 0) {
        throw new Error("Beleg nicht gefunden");
      }

      return { success: true, deletedId: id };
    } catch (error) {
      console.error("Fehler beim Löschen des Belegs:", error);
      throw error;
    }
  });
}
