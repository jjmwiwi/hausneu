import { Beleg, WEGEinheit, Kostenart } from '../contexts/ImmobilienContext';

export interface UmlageBasis {
  einheitId: string;
  basis: number;
}

export interface UmlageAnteil {
  einheitId: string;
  prozent: number;
  betrag: number;
}

export interface UmlageSnapshot {
  jahr: number;
  verteilschluesselId: string;
  basis: UmlageBasis[];
  anteile: UmlageAnteil[];
  summe: number;
  fallback?: 'wohnflaeche' | 'mea' | null;
  hinweise?: string[];
}

export interface UmlageResult {
  basis: UmlageBasis[];
  anteile: UmlageAnteil[];
  summe: number;
  fallback?: 'wohnflaeche' | 'mea' | null;
  hinweise?: string[];
}

export interface UmlageViewByEinheit {
  einheiten: Array<{
    einheitId: string;
    wohnungsnummer: string;
    wohnflaeche: number;
    mea: number;
  }>;
  rowsByEinheit: Record<string, Array<{
    belegId: string;
    datum: string;
    belegname: string;
    kostenartId: string;
    kostenartName: string;
    verteilschluesselId: string;
    anteilProzent: number;
    anteilBetrag: number;
    belegBetrag: number;
    umlageStatus: 'AUTO' | 'MANUELL' | 'FEHLER';
    hinweise?: string[];
  }>>;
  sumByEinheit: Record<string, number>;
  grandTotal: number;
  belegCount: number;
  fehlendeSnapshots: number;
}

export type Verteilschluessel = 'WOHNFLAECHE' | 'MEA' | 'ANZAHL_WOHNUNGEN' | 'VERBRAUCH_WASSER' | 'VERBRAUCH_STROM' | 'VERBRAUCH_WAERME' | 'INDIVIDUELL';

export class UmlageService {
  /**
   * Holt die Basis für die Umlage-Berechnung basierend auf dem Verteilerschlüssel
   */
  static async getBasis(
    wegId: string, 
    jahr: number, 
    schluessel: Verteilschluessel,
    einheiten: WEGEinheit[]
  ): Promise<UmlageBasis[]> {
    try {
      // Filtere Einheiten nach WEG-ID
      const wegEinheiten = einheiten.filter(e => e.wegId === wegId);
      
      if (wegEinheiten.length === 0) {
        throw new Error(`Keine Einheiten für WEG ${wegId} gefunden`);
      }

      const basis: UmlageBasis[] = [];

      for (const einheit of wegEinheiten) {
        let basisValue = 0;

        switch (schluessel) {
          case 'WOHNFLAECHE':
            basisValue = einheit.wohnflaeche || 0;
            break;
          case 'MEA':
            basisValue = einheit.miteigentumsAnteil || 0;
            break;
          case 'ANZAHL_WOHNUNGEN':
            basisValue = 1; // Jede Einheit = 1 Wohnung
            break;
          case 'VERBRAUCH_WASSER':
          case 'VERBRAUCH_STROM':
          case 'VERBRAUCH_WAERME':
            // Für Verbrauch-basierte Verteilung: Standardmäßig MEA verwenden
            basisValue = einheit.miteigentumsAnteil || 0;
            break;
          case 'INDIVIDUELL':
            // Für individuelle Verteilung: Standardmäßig MEA verwenden
            basisValue = einheit.miteigentumsAnteil || 0;
            break;
          default:
            // Fallback auf MEA
            basisValue = einheit.miteigentumsAnteil || 0;
        }

        basis.push({
          einheitId: einheit.id,
          basis: basisValue
        });
      }

      return basis;
    } catch (error) {
      console.error('Fehler beim Abrufen der Umlage-Basis:', error);
      throw error;
    }
  }

  /**
   * Berechnet die Umlage für einen Beleg
   */
  static async calcUmlage(
    beleg: Beleg,
    einheiten: WEGEinheit[]
  ): Promise<UmlageResult> {
    try {
      const { verteilschluesselId, jahr, wegId, betragBrutto } = beleg;

      // Basis für jede Einheit berechnen
      const basis = await this.getBasis(wegId, jahr, verteilschluesselId as Verteilschluessel, einheiten);

      // Gesamtsumme der Basis
      const summeBasis = basis.reduce((sum, item) => sum + item.basis, 0);

      // Prüfe ob Basiswerte vorhanden sind
      if (summeBasis <= 0) {
        return {
          basis,
          anteile: [],
          summe: 0,
          hinweise: ['Keine Basiswerte für Umlage verfügbar'],
          fallback: null
        };
      }

      // Anteile und Beträge berechnen
      const anteile: UmlageAnteil[] = [];
      let summeAnteile = 0;

      for (const item of basis) {
        const prozent = (item.basis / summeBasis) * 100;
        const betrag = (prozent / 100) * Math.abs(betragBrutto);
        
        // Auf 2 Dezimalstellen runden
        const gerundeterBetrag = Math.round(betrag * 100) / 100;
        
        anteile.push({
          einheitId: item.einheitId,
          prozent: Math.round(prozent * 100) / 100, // Auf 2 Dezimalstellen runden
          betrag: gerundeterBetrag
        });
        
        summeAnteile += gerundeterBetrag;
      }

      // Rest-Cent-Verteilung (Rundungsdifferenzen ausgleichen)
      const rundungsDifferenz = Math.abs(betragBrutto) - summeAnteile;
      
      if (Math.abs(rundungsDifferenz) > 0.01) {
        // Verteile Rundungsdifferenz auf die erste Einheit
        if (anteile.length > 0) {
          anteile[0].betrag = Math.round((anteile[0].betrag + rundungsDifferenz) * 100) / 100;
          summeAnteile = Math.round((summeAnteile + rundungsDifferenz) * 100) / 100;
        }
      }

      // Fallback-Verteilerschlüssel bestimmen
      let fallback: 'wohnflaeche' | 'mea' | null = null;
      if (verteilschluesselId === 'VERBRAUCH_WASSER' || 
          verteilschluesselId === 'VERBRAUCH_STROM' || 
          verteilschluesselId === 'VERBRAUCH_WAERME') {
        fallback = 'mea';
      }

      // Hinweise sammeln
      const hinweise: string[] = [];
      
      if (Math.abs(summeAnteile - Math.abs(betragBrutto)) > 0.01) {
        hinweise.push(`Rundungsdifferenz: ${Math.abs(summeAnteile - Math.abs(betragBrutto)).toFixed(2)}€`);
      }
      
      if (verteilschluesselId === 'INDIVIDUELL') {
        hinweise.push('Individuelle Verteilung - manuelle Anpassung erforderlich');
      }

      // Prüfe ob alle Anteile dem Belegbetrag entsprechen
      if (Math.abs(summeAnteile - Math.abs(betragBrutto)) <= 0.01) {
        hinweise.push('Umlage erfolgreich berechnet');
      } else {
        hinweise.push('Umlage-Berechnung mit Rundungsdifferenzen');
      }

      return {
        basis,
        anteile,
        summe: summeAnteile,
        fallback,
        hinweise
      };
    } catch (error) {
      console.error('Fehler bei der Umlage-Berechnung:', error);
      throw error;
    }
  }

  /**
   * Speichert den Umlage-Snapshot am Beleg
   */
  static async saveSnapshot(
    beleg: Beleg,
    snapshot: UmlageSnapshot,
    quelle: 'auto' | 'manuell'
  ): Promise<Beleg> {
    try {
      // Aktualisiere den Beleg mit dem Snapshot
      const updatedBeleg: Beleg = {
        ...beleg,
        umlageSnapshot: snapshot,
        umlageQuelle: quelle,
        updatedAt: new Date().toISOString()
      };

      // Hier würde normalerweise der Beleg im Storage aktualisiert werden
      // Da wir den Context verwenden, geben wir den aktualisierten Beleg zurück
      console.log(`Umlage-Snapshot für Beleg ${beleg.id} gespeichert (Quelle: ${quelle})`);
      
      return updatedBeleg;
    } catch (error) {
      console.error('Fehler beim Speichern des Umlage-Snapshots:', error);
      throw error;
    }
  }

  /**
   * Vollständiger Umlage-Prozess: Berechnung + Speicherung
   */
  static async processUmlage(
    beleg: Beleg,
    einheiten: WEGEinheit[],
    quelle: 'auto' | 'manuell' = 'auto'
  ): Promise<{ beleg: Beleg; snapshot: UmlageSnapshot }> {
    try {
      // Umlage berechnen
      const umlageResult = await this.calcUmlage(beleg, einheiten);
      
      // Snapshot erstellen
      const snapshot: UmlageSnapshot = {
        jahr: beleg.jahr,
        verteilschluesselId: beleg.verteilschluesselId,
        basis: umlageResult.basis,
        anteile: umlageResult.anteile,
        summe: umlageResult.summe,
        fallback: umlageResult.fallback,
        hinweise: umlageResult.hinweise
      };

      // Snapshot am Beleg speichern
      const updatedBeleg = await this.saveSnapshot(beleg, snapshot, quelle);

      return {
        beleg: updatedBeleg,
        snapshot
      };
    } catch (error) {
      console.error('Fehler beim Umlage-Prozess:', error);
      throw error;
    }
  }

  /**
   * Validiert ob die Umlage korrekt berechnet wurde
   */
  static validateUmlage(beleg: Beleg, snapshot: UmlageSnapshot): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Prüfe ob Summe der Anteile dem Belegbetrag entspricht
    const belegBetrag = Math.abs(beleg.betragBrutto);
    const summeAnteile = snapshot.summe;
    
    if (Math.abs(summeAnteile - belegBetrag) > 0.01) {
      errors.push(`Umlage-Summe (${summeAnteile}€) entspricht nicht dem Belegbetrag (${belegBetrag}€)`);
    }

    // Prüfe ob alle Einheiten einen Anteil haben
    if (snapshot.anteile.length === 0) {
      errors.push('Keine Anteile in der Umlage berechnet');
    }

    // Prüfe ob alle Anteile positive Werte haben
    const negativeAnteile = snapshot.anteile.filter(a => a.betrag < 0);
    if (negativeAnteile.length > 0) {
      errors.push('Negative Anteile in der Umlage gefunden');
    }

    // Prüfe ob Prozentsumme ≈ 100%
    const prozentSumme = snapshot.anteile.reduce((sum, a) => sum + a.prozent, 0);
    if (Math.abs(prozentSumme - 100) > 0.01) {
      errors.push(`Prozentsumme (${prozentSumme.toFixed(2)}%) entspricht nicht 100%`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Formatiert die Umlage für die Anzeige
   */
  static formatUmlage(snapshot: UmlageSnapshot): string {
    if (!snapshot || snapshot.anteile.length === 0) {
      return 'Keine Umlage verfügbar';
    }

    const anteileText = snapshot.anteile
      .map(a => `${a.einheitId}: ${a.prozent.toFixed(2)}% (${a.betrag.toFixed(2)}€)`)
      .join(', ');

    return `Gesamt: ${snapshot.summe.toFixed(2)}€ - ${anteileText}`;
  }

  /**
   * Bereitet die Umlage-Ansicht nach Einheiten auf
   */
  static async getUmlageViewByEinheit(
    wegId: string,
    jahr: number,
    filters?: {
      kostenartenIds?: string[];
      status?: 'ENTWURF' | 'GEBUCHT' | 'ALLE';
      search?: string;
      nurMitSnapshot?: boolean;
    }
  ): Promise<UmlageViewByEinheit> {
    try {
      // Belege für WEG und Jahr laden
      const belege = await this.getBelegeForWeg(wegId, jahr);
      
      // Einheiten für WEG laden
      const einheiten = await this.getEinheitenForWeg(wegId);
      
      // Filter anwenden
      const gefilterteBelege = this.filterBelege(belege, filters);
      
      // Daten nach Einheiten gruppieren
      const rowsByEinheit: Record<string, Array<any>> = {};
      const sumByEinheit: Record<string, number> = {};
      let grandTotal = 0;
      let fehlendeSnapshots = 0;
      
      // Einheiten initialisieren
      einheiten.forEach(einheit => {
        rowsByEinheit[einheit.id] = [];
        sumByEinheit[einheit.id] = 0;
      });
      
      // Belege verarbeiten
      for (const beleg of gefilterteBelege) {
        if (!beleg.umlageSnapshot) {
          fehlendeSnapshots++;
          continue;
        }
        
        // Für jeden Anteil im Snapshot eine Zeile erstellen
        for (const anteil of beleg.umlageSnapshot.anteile) {
          const einheitId = anteil.einheitId;
          if (rowsByEinheit[einheitId]) {
            const umlageStatus: 'AUTO' | 'MANUELL' | 'FEHLER' = 
              beleg.umlageSnapshot?.hinweise?.some(h => h.includes('Fehler')) ? 'FEHLER' :
              beleg.umlageQuelle === 'auto' ? 'AUTO' : 'MANUELL';
            
            rowsByEinheit[einheitId].push({
              belegId: beleg.id,
              datum: beleg.datum,
              belegname: beleg.belegname,
              kostenartId: beleg.kostenartId,
              kostenartName: await this.getKostenartName(beleg.kostenartId),
              verteilschluesselId: beleg.verteilschluesselId,
              anteilProzent: anteil.prozent,
              anteilBetrag: anteil.betrag,
              belegBetrag: beleg.betragBrutto,
              umlageStatus,
              hinweise: beleg.umlageSnapshot?.hinweise
            });
            
            // Summen aktualisieren
            sumByEinheit[einheitId] += anteil.betrag;
            grandTotal += anteil.betrag;
          }
        }
      }
      
      return {
        einheiten: einheiten.map(e => ({
          einheitId: e.id,
          wohnungsnummer: e.wohnungsnummer.toString(),
          wohnflaeche: e.wohnflaeche,
          mea: e.miteigentumsAnteil
        })),
        rowsByEinheit,
        sumByEinheit,
        grandTotal,
        belegCount: gefilterteBelege.length,
        fehlendeSnapshots
      };
    } catch (error) {
      console.error('Fehler beim Aufbereiten der Umlage-Ansicht:', error);
      throw error;
    }
  }

  /**
   * Lädt Belege für eine WEG und ein Jahr
   */
  private static async getBelegeForWeg(wegId: string, jahr: number): Promise<Beleg[]> {
    // TODO: Implementierung über den Context
    // Für jetzt verwenden wir Mock-Daten
    return [];
  }

  /**
   * Lädt Einheiten für eine WEG
   */
  private static async getEinheitenForWeg(wegId: string): Promise<WEGEinheit[]> {
    // TODO: Implementierung über den Context
    // Für jetzt verwenden wir Mock-Daten
    return [];
  }

  /**
   * Filtert Belege nach den angegebenen Kriterien
   */
  private static filterBelege(
    belege: Beleg[],
    filters?: {
      kostenartenIds?: string[];
      status?: 'ENTWURF' | 'GEBUCHT' | 'ALLE';
      search?: string;
      nurMitSnapshot?: boolean;
    }
  ): Beleg[] {
    let gefiltert = [...belege];
    
    if (filters?.kostenartenIds && filters.kostenartenIds.length > 0) {
      gefiltert = gefiltert.filter(b => filters.kostenartenIds!.includes(b.kostenartId));
    }
    
    if (filters?.status && filters.status !== 'ALLE') {
      gefiltert = gefiltert.filter(b => b.status === filters.status);
    }
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      gefiltert = gefiltert.filter(b => 
        b.belegname.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters?.nurMitSnapshot !== false) {
      gefiltert = gefiltert.filter(b => b.umlageSnapshot);
    }
    
    return gefiltert;
  }

  /**
   * Holt den Namen einer Kostenart
   */
  private static async getKostenartName(kostenartId: string): Promise<string> {
    // TODO: Implementierung über den Context
    return 'Unbekannte Kostenart';
  }
}

export default UmlageService;
