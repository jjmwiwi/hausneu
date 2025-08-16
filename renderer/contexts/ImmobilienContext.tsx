import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadWEGEinheiten, saveWEGEinheiten, hasStoredWEGEinheiten, repairWEGEinheiten } from '../storage/wegEinheitenStorage';
import { loadStammdaten, saveStammdaten, hasStoredStammdaten } from '../storage/stammdatenStorage';
import { loadKostenarten, saveKostenarten, hasKostenarten, Verteilschluessel } from '../storage/kostenartenStorage';
import { loadZaehler, saveZaehler } from '../storage/zaehlerStorage';
import { loadZaehlerstaende, upsertZaehlerstand } from '../storage/zaehlerstaendeStorage';
import { loadBelege, saveBelege, hasBelege, createBeleg, updateBeleg, deleteBeleg } from '../storage/belegStorage';
import UmlageService from '../services/umlageService';
import { Zaehler } from '../../src/types/zaehler.types';
import { ZAHLERTYP_EINHEIT } from '../../src/types/zaehler.types';
import zaehlerService from '../../src/services/zaehler.service';

// Hilfsfunktion um Duplikate zu verhindern
function uniqById<T extends { id: string }>(array: T[]): T[] {
  const seen = new Set<string>();
  return array.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

// OPTIMISTIC UPDATES: Robuste Lösung gegen Race Conditions
type OptimisticZaehler = Zaehler & { __temp?: true, __opId?: number };

const unionById = (a: Zaehler[], b: Zaehler[]) => {
  const map = new Map<string, Zaehler>();
  
  // WICHTIG: Füge zuerst alle Zähler hinzu, aber priorisiere die neuesten Daten
  for (const x of a) {
    if (!x.id.startsWith('temp:')) {
      map.set(x.id, x);
    }
  }
  
  // Füge dann die zweiten Daten hinzu, aber priorisiere die neuesten
  for (const x of b) {
    if (x.id.startsWith('temp:')) {
      // Prüfe ob ein Server-Äquivalent bereits existiert
      const hasServerEquivalent = a.some(serverZ => 
        !serverZ.id.startsWith('temp:') && 
        serverZ.einheitId === x.einheitId && 
        serverZ.zaehlernummer === x.zaehlernummer &&
        serverZ.zaehlertyp === x.zaehlertyp
      );
      
      if (!hasServerEquivalent) {
        map.set(x.id, x);
      } else {
        console.debug('[unionById] Temp-ID übersprungen, da Server-Äquivalent existiert:', x.id);
      }
    } else {
      // WICHTIG: Bei Duplikaten: behalte den neuesten (basierend auf updatedAt)
      const existing = map.get(x.id);
      if (!existing) {
        map.set(x.id, x);
      } else {
        // Vergleiche updatedAt Timestamps
        const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);
        const newDate = new Date(x.updatedAt || x.createdAt || 0);
        
        if (newDate > existingDate) {
          // Neuerer Zähler überschreibt den älteren
          map.set(x.id, x);
          console.debug(`[unionById] Neuerer Zähler überschreibt älteren: ${x.id} (${x.notiz || 'keine Notiz'})`);
        } else {
          // Älterer Zähler bleibt bestehen
          console.debug(`[unionById] Älterer Zähler bleibt bestehen: ${existing.id} (${existing.notiz || 'keine Notiz'})`);
        }
      }
    }
  }
  
  return Array.from(map.values());
};

export interface WEGEinheit {
  id: string;
  wegId: string; // WEG-ID für Zuordnung
  titel: string;
  wohnungsnummer: number;
  mieter?: string;
  email?: string;
  telefon?: string;
  wohnflaeche: number; // Umbenennung von flaecheM2 für Konsistenz
  miteigentumsAnteil: number; // MEA als Pflichtfeld
}

export interface Kostenart {
  id: string;
  name: string;
  verteilschluesselId: Verteilschluessel; // Umbenennung für Konsistenz
  aktiv: boolean; // Aktiv/Inaktiv Status
}

export interface Beleg {
  id: string;
  wegId: string;
  datum: string;                     // ISO yyyy-mm-dd
  belegname: string;                 // UI: „Belegname *"
  betragBrutto: number;              // EUR (±)
  mwstSatz: number;                  // 0|7|19|custom 0..100
  netto: number;                     // derived
  steuerlicheKostenart?: string;     // optional
  kostenartId: string;               // Pflicht
  verteilschluesselId: string;       // redundanter Snapshot aus Kostenart
  jahr: number;                      // Abrechnungsjahr (Ganzjahr)
  periodeVon: string; 
  periodeBis: string;                // YYYY-01-01 .. YYYY-12-31
  lohnkosten35aBrutto?: number;      // optional
  anhang?: { 
    name: string; 
    mime: string; 
    size: number; 
    url: string 
  } | null;
  status: 'ENTWURF' | 'GEBUCHT';
  abgerechnet: boolean;              // read-only, durch Abrechnung
  umlageSnapshot?: {
    jahr: number;
    verteilschluesselId: string;
    basis: Array<{ einheitId: string; basis: number }>;
    anteile: Array<{ einheitId: string; prozent: number; betrag: number }>;
    summe: number;
    fallback?: 'wohnflaeche' | 'mea' | null;
    hinweise?: string[];
  };
  umlageQuelle: 'auto' | 'manuell';
  createdAt: string; 
  updatedAt: string;
}

interface Stammdaten {
  name: string;
  address: string;
  city: string;
  zip: string;
  notes: string;
  image?: string;
  heizungsdaten: {
    heizungsart: string;
    brennstoff: string;
    beheizteWohnflaeche: number;
    vorlauftemperatur: number;
    einheitWarmwasser: string;
    keinVerbrauch: boolean;
    verbrauchsAnteil: number;
  };
}

interface ImmobilienContextType {
  stammdaten: Stammdaten;
  wegEinheiten: WEGEinheit[];
  kostenarten: Kostenart[];
  zaehler: Zaehler[];
  zaehlerstaende: any[]; // Zählerstände für jahresspezifische Daten
  belege: Beleg[];
  selectedWegId: string | null;
  selectWeg: (wegId: string) => void;
  updateStammdaten: (newData: Partial<Stammdaten>) => void;
  updateWEGEinheit: (einheitId: string, patch: Partial<WEGEinheit>) => void;
  updateKostenarten: (kostenarten: Kostenart[]) => void;
  updateKostenart: (id: string, updates: Partial<Kostenart>) => void;
  repairWEGEinheitenData: () => void;
  // Zähler-Management
  loadZaehler: (wegId: string) => Promise<void>;
  createZaehler: (wegId: string, zaehlerData: Partial<Zaehler>) => Promise<Zaehler>;
  updateZaehler: (wegId: string, zaehlerId: string, updates: Partial<Zaehler>) => Promise<Zaehler>;
  deleteZaehler: (wegId: string, zaehlerId: string) => Promise<void>;
  purgeAllZaehler: (wegId: string) => Promise<number>;
  refreshZaehler: (wegId: string) => Promise<void>;
  // Beleg-Management
  createBeleg: (belegData: Omit<Beleg, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Beleg>;
  updateBeleg: (id: string, updates: Partial<Beleg>) => Promise<Beleg | null>;
  deleteBeleg: (id: string) => Promise<boolean>;
  recalculateUmlage: (belegId: string) => Promise<Beleg | null>;
  // Ablesewerte
  upsertReading: (wegId: string, jahr: number, zaehlerId: string, values: { startwert?: number | null; ablesewert?: number | null; notiz?: string }) => Promise<Zaehler>;
  updateNote: (wegId: string, zaehlerId: string, notiz: string) => Promise<Zaehler>;
  reloadZaehlerstaende: () => any[]; // WICHTIG: Neue Funktion für Navigation
  loadZaehlerstaendeForYear: (jahr: number) => any[];
  debugFindAllZaehler: () => Promise<void>;
}

const defaultStammdaten: Stammdaten = {
  name: 'WEG Stuttgarter Strasse 104',
  address: 'Stuttgarter Strasse 104',
  city: 'Leonberg',
  zip: '71229',
  notes: 'Wohnungseigentümergemeinschaft',
  image: '',
  heizungsdaten: {
    heizungsart: 'Zentral mit Warmwasser',
    brennstoff: 'Heizleistung (kWh)',
    beheizteWohnflaeche: 473.22,
    vorlauftemperatur: 60,
    einheitWarmwasser: 'Wärmemenge Warmwasser (MWh)',
    keinVerbrauch: false,
    verbrauchsAnteil: 70
  }
};

  const defaultWEGEinheiten: WEGEinheit[] = [
    { id: '1', wegId: 'weg-1', titel: 'Wohnung Haus oben', wohnungsnummer: 4, mieter: 'Rudolf Klee', email: 'klee@example.de', telefon: '01718327771', wohnflaeche: 120, miteigentumsAnteil: 25 },
    { id: '2', wegId: 'weg-1', titel: 'Wohnung Haus unten', wohnungsnummer: 3, mieter: 'Rudolf Klee', email: 'klee@example.de', telefon: '01718327771', wohnflaeche: 110, miteigentumsAnteil: 23 },
    { id: '3', wegId: 'weg-1', titel: 'Wohnung Haus vorne', wohnungsnummer: 2, mieter: 'Amerika', email: 'amerika@example.de', telefon: '01718327772', wohnflaeche: 95, miteigentumsAnteil: 20 },
    { id: '4', wegId: 'weg-1', titel: 'Wohnung Keller vorne', wohnungsnummer: 1, mieter: 'Jürgen Müller', email: 'mueller@example.de', telefon: '01718327773', wohnflaeche: 85, miteigentumsAnteil: 18 }
  ];

  const defaultKostenarten: Kostenart[] = [
    { id: '1', name: 'Ablesung', verteilschluesselId: 'MEA', aktiv: true },
    { id: '2', name: 'Bankgebühren', verteilschluesselId: 'MEA', aktiv: true },
    { id: '3', name: 'Gebäudeversicherung', verteilschluesselId: 'MEA', aktiv: true },
    { id: '4', name: 'Grundsteuer', verteilschluesselId: 'WOHNFLAECHE', aktiv: true },
    { id: '5', name: 'Gutschriften', verteilschluesselId: 'VERBRAUCH_STROM', aktiv: true },
    { id: '6', name: 'Haftpflichtversicherung', verteilschluesselId: 'MEA', aktiv: true },
    { id: '7', name: 'Hausausrüstung', verteilschluesselId: 'MEA', aktiv: true },
    { id: '8', name: 'Hausratversicherung', verteilschluesselId: 'MEA', aktiv: true },
    { id: '9', name: 'Hausstrom', verteilschluesselId: 'MEA', aktiv: true },
    { id: '10', name: 'Hausverwaltung', verteilschluesselId: 'ANZAHL_WOHNUNGEN', aktiv: true },
    { id: '11', name: 'Hauswart', verteilschluesselId: 'WOHNFLAECHE', aktiv: true },
    { id: '12', name: 'Heizung (externe Abrechnung)', verteilschluesselId: 'INDIVIDUELL', aktiv: true },
    { id: '13', name: 'Heizung (Grundkosten)', verteilschluesselId: 'MEA', aktiv: true },
    { id: '14', name: 'Heizung (Verbrauch)', verteilschluesselId: 'VERBRAUCH_WAERME', aktiv: true },
    { id: '15', name: 'Heizung & Heizungswartung', verteilschluesselId: 'MEA', aktiv: true },
    { id: '16', name: 'Instandhaltung', verteilschluesselId: 'MEA', aktiv: true },
    { id: '17', name: 'Minol', verteilschluesselId: 'MEA', aktiv: true },
    { id: '18', name: 'Müllgebühren', verteilschluesselId: 'INDIVIDUELL', aktiv: true },
    { id: '19', name: 'Niederschlagswasser', verteilschluesselId: 'VERBRAUCH_WASSER', aktiv: true },
    { id: '20', name: 'Schmutzwasser', verteilschluesselId: 'VERBRAUCH_WASSER', aktiv: true },
    { id: '21', name: 'Schornsteinfeger', verteilschluesselId: 'MEA', aktiv: true },
    { id: '22', name: 'Straßenreinigung', verteilschluesselId: 'MEA', aktiv: true },
    { id: '23', name: 'Trinkwasser', verteilschluesselId: 'VERBRAUCH_WASSER', aktiv: true },
          { id: '24', name: 'Warmwasser (Grundkosten)', verteilschluesselId: 'WOHNFLAECHE', aktiv: true },
      { id: '25', name: 'Warmwasser (Verbrauch)', verteilschluesselId: 'VERBRAUCH_WAERME', aktiv: true }
  ];

const ImmobilienContext = createContext<ImmobilienContextType | undefined>(undefined);

export const useImmobilien = () => {
  const context = useContext(ImmobilienContext);
  if (context === undefined) {
    throw new Error('useImmobilien must be used within an ImmobilienProvider');
  }
  return context;
};

interface ImmobilienProviderProps {
  children: ReactNode;
}

export const ImmobilienProvider: React.FC<ImmobilienProviderProps> = ({ children }) => {
  const [stammdaten, setStammdaten] = useState<Stammdaten>(defaultStammdaten);
  const [wegEinheiten, setWEGEinheiten] = useState<WEGEinheit[]>([]);
  const [kostenarten, setKostenarten] = useState<Kostenart[]>([]);
  const [zaehler, setZaehler] = useState<Zaehler[]>([]);
  const [zaehlerstaende, setZaehlerstaende] = useState<any[]>([]);
  const [belege, setBelege] = useState<Beleg[]>([]);
  const [selectedWegId, setSelectedWegId] = useState<string | null>(null);
  
  // OPTIMISTIC UPDATES: Robuste Lösung mit Refs
  const pendingCreatesRef = useRef<Map<string, OptimisticZaehler>>(new Map());
  const opCounterRef = useRef(0);
  
  // Wrapper für setZaehler mit Logging
  const setZaehlerWithLog = (updater: Zaehler[] | ((prev: Zaehler[]) => Zaehler[])) => {
    setZaehler(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const refChanged = prev !== next;
      
      // STATIC GUARD: Keine .push/.splice/.sort auf zaehler-State!
      if (Array.isArray(next)) {
        // Prüfe auf versteckte Mutationen
        if (next === prev) {
          console.error('[STATIC GUARD] FEHLER: setZaehler gibt dieselbe Referenz zurück!');
          console.error('[STATIC GUARD] Das deutet auf .push/.splice/.sort hin!');
          throw new Error('STATIC GUARD: setZaehler muss neue Referenz zurückgeben!');
        }
      }
      
      console.debug(`[CTX] setZaehler nextLen=${next.length} refChanged=${refChanged} prevLen=${prev.length}`);
      return next;
    });
  };
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStammdatenInitialized, setIsStammdatenInitialized] = useState(false);
  const [isKostenartenInitialized, setIsKostenartenInitialized] = useState(false);
  const [isBelegeInitialized, setIsBelegeInitialized] = useState(false);

  // Initialisierung - WICHTIG: Keine Dependencies um Loop zu verhindern!
  useEffect(() => {
    const initialize = async () => {
      if (isInitialized) return;
      
      try {
        console.log('[Context] Starte Initialisierung...');
        
        // Lade gespeicherte Daten
        const savedStammdaten = await loadStammdaten();
        const savedKostenarten = await loadKostenarten();
        
        // Setze gespeicherte Daten
        if (savedStammdaten) {
          setStammdaten(savedStammdaten);
          setIsStammdatenInitialized(true);
        }
        
        if (savedKostenarten && savedKostenarten.length > 0) {
          setKostenarten(savedKostenarten);
        }
        
        // WICHTIG: WEG-Einheiten werden jetzt separat in initializeWEGEinheiten() geladen
        // Lade Zähler für die erste WEG (wird nach WEG-Einheiten-Initialisierung gesetzt)
        const loadedZaehlerstaende = loadZaehlerstaende();
        if (loadedZaehlerstaende.length > 0) {
          setZaehlerstaende(loadedZaehlerstaende);
          console.log(`[Context] ${loadedZaehlerstaende.length} Zählerstände geladen`);
        }
        
        setIsInitialized(true);
        console.log('[Context] Basis-Initialisierung abgeschlossen');
      } catch (error) {
        console.error('[Context] Fehler bei der Initialisierung:', error);
      }
    };
    
    initialize();
  }, []); // KEINE DEPENDENCIES - verhindert Navigation-Loop!

  // Initialisiere WEG-Einheiten beim ersten Laden - KEINE DEPENDENCIES!
  useEffect(() => {
    if (!isInitialized) {
      initializeWEGEinheiten();
    }
  }, []); // KEINE DEPENDENCIES - verhindert Navigation-Loop!

  // Initialisiere Stammdaten beim ersten Laden - KEINE DEPENDENCIES!
  useEffect(() => {
    if (!isStammdatenInitialized) {
      initializeStammdaten();
    }
  }, []); // KEINE DEPENDENCIES - verhindert Navigation-Loop!

  // Initialisiere Kostenarten beim ersten Laden - KEINE DEPENDENCIES!
  useEffect(() => {
    if (!isKostenartenInitialized) {
      initializeKostenarten();
    }
  }, []); // KEINE DEPENDENCIES - verhindert Navigation-Loop!

  // Initialisiere Belege beim ersten Laden - KEINE DEPENDENCIES!
  useEffect(() => {
    if (!isBelegeInitialized) {
      initializeBelege();
    }
  }, []); // KEINE DEPENDENCIES - verhindert Navigation-Loop!

  // WICHTIG: Lade Zähler und Zählerstände wenn sich selectedWegId ändert
  useEffect(() => {
    if (selectedWegId) {
      console.log(`[Context] selectedWegId geändert auf: ${selectedWegId}`);
      
      // Lade die Zählerstände für die ausgewählte WEG
      const loadedZaehlerstaende = loadZaehlerstaende();
      setZaehlerstaende(loadedZaehlerstaende);
      console.log(`[Context] Zählerstände für WEG ${selectedWegId} geladen: ${loadedZaehlerstaende.length} Einträge`);
      
      // Lade die Zähler für die ausgewählte WEG
      const loadZaehlerForWeg = async () => {
        try {
          const loadedZaehler = await zaehlerService.list(selectedWegId);
          if (loadedZaehler.length > 0) {
            setZaehler(loadedZaehler);
            console.log(`[Context] ${loadedZaehler.length} Zähler für WEG ${selectedWegId} geladen`);
          } else {
            console.log(`[Context] Keine Zähler für WEG ${selectedWegId} gefunden`);
            setZaehler([]);
          }
        } catch (error) {
          console.error(`[Context] Fehler beim Laden der Zähler für WEG ${selectedWegId}:`, error);
          setZaehler([]);
        }
      };
      
      loadZaehlerForWeg();
    }
  }, [selectedWegId]); // Reagiere auf selectedWegId Änderungen

  // WICHTIG: Debug-Funktion zum Finden aller Zähler (auch mit falscher wegId)
  const debugFindAllZaehler = async () => {
    try {
      console.log('[Context] 🔍 Debug: Suche nach allen Zählern in allen Quellen...');
      
      // 1. Versuche alle Zähler aus IndexedDB zu laden
      try {
        const allIndexedDBZaehler = await zaehlerService.getAllZaehlerFromIndexedDB();
        console.log('[Context] 🔍 IndexedDB Zähler gefunden:', allIndexedDBZaehler.length);
        allIndexedDBZaehler.forEach(z => {
          console.log(`[Context] 🔍 IndexedDB: ${z.zaehlernummer} (${z.bezeichnung}) - wegId: ${z.wegId}, einheitId: ${z.einheitId}`);
        });
      } catch (error) {
        console.log('[Context] 🔍 IndexedDB nicht verfügbar:', error);
      }
      
      // 2. Versuche alle Zähler aus localStorage zu laden
      try {
        const allLocalStorageZaehler = await zaehlerService.getAllZaehlerFromLocalStorage();
        console.log('[Context] 🔍 localStorage Zähler gefunden:', allLocalStorageZaehler.length);
        allLocalStorageZaehler.forEach(z => {
          console.log(`[Context] 🔍 localStorage: ${z.zaehlernummer} (${z.bezeichnung}) - wegId: ${z.wegId}, einheitId: ${z.einheitId}`);
        });
      } catch (error) {
        console.log('[Context] 🔍 localStorage nicht verfügbar:', error);
      }
      
      // 3. Suche speziell nach dem "Stroh"-Zähler
      try {
        const strohZaehler = await zaehlerService.findZaehlerByNummer('Stroh');
        if (strohZaehler) {
          console.log('[Context] 🔍 Stroh-Zähler gefunden:', strohZaehler);
        } else {
          console.log('[Context] 🔍 Stroh-Zähler NICHT gefunden');
        }
      } catch (error) {
        console.log('[Context] 🔍 Fehler beim Suchen nach Stroh-Zähler:', error);
      }
      
    } catch (error) {
      console.error('[Context] 🔍 Fehler beim Debug-Finden aller Zähler:', error);
    }
  };

  // WICHTIG: Manuelle Funktion zum Neuladen der Zählerstände nach Navigation
  const reloadZaehlerstaende = () => {
    const loadedZaehlerstaende = loadZaehlerstaende();
    setZaehlerstaende(loadedZaehlerstaende);
    console.log(`[Context] Zählerstände manuell neu geladen: ${loadedZaehlerstaende.length} Einträge`);
    return loadedZaehlerstaende;
  };

  // WICHTIG: Funktion zum Laden der Zählerstände für ein spezifisches Jahr
  const loadZaehlerstaendeForYear = (jahr: number) => {
    const allZaehlerstaende = loadZaehlerstaende();
    const jahrStaende = allZaehlerstaende.filter(zs => zs.jahr === jahr);
    console.log(`[Context] Zählerstände für Jahr ${jahr} geladen: ${jahrStaende.length} Einträge`);
    return jahrStaende;
  };

  const initializeWEGEinheiten = () => {
    try {
      console.log('[Context] Initialisiere WEG-Einheiten...');
      
      // Prüfe ob gespeicherte Daten existieren
      if (hasStoredWEGEinheiten()) {
        // Lade gespeicherte Daten
        const gespeicherteEinheiten = loadWEGEinheiten();
        console.log(`[Context] ${gespeicherteEinheiten.length} gespeicherte WEG-Einheiten gefunden`);
        
        if (gespeicherteEinheiten.length > 0) {
          console.log(`[Context] ${gespeicherteEinheiten.length} gespeicherte WEG-Einheiten geladen`);
          
          // Prüfe ob die geladenen Daten vollständig sind
          const vollstaendigeEinheiten = gespeicherteEinheiten.map(einheit => {
            if (!einheit.miteigentumsAnteil || !einheit.wohnflaeche) {
              // Finde die entsprechende Standardeinheit
              const defaultEinheit = defaultWEGEinheiten.find(d => d.wohnungsnummer === einheit.wohnungsnummer);
              if (defaultEinheit) {
                return {
                  ...defaultEinheit,
                  ...einheit,
                  miteigentumsAnteil: einheit.miteigentumsAnteil || defaultEinheit.miteigentumsAnteil,
                  wohnflaeche: einheit.wohnflaeche || defaultEinheit.wohnflaeche
                };
              }
            }
            return einheit;
          });
          
          setWEGEinheiten(vollstaendigeEinheiten);
          console.log(`[Context] WEG-Einheiten gesetzt:`, vollstaendigeEinheiten);
          
          // Speichere die reparierten Daten
          if (JSON.stringify(vollstaendigeEinheiten) !== JSON.stringify(gespeicherteEinheiten)) {
            console.log('[Context] Reparierte WEG-Einheiten werden gespeichert');
            saveWEGEinheiten(vollstaendigeEinheiten);
          }
        } else {
          // Fallback zu Mock-Daten wenn gespeicherte Daten leer sind
          console.log('[Context] Keine gespeicherten WEG-Einheiten gefunden, verwende Mock-Daten');
          setWEGEinheiten(defaultWEGEinheiten);
          saveWEGEinheiten(defaultWEGEinheiten);
        }
      } else {
        // Keine gespeicherten Daten vorhanden, verwende Mock-Daten und speichere sie
        console.log('[Context] Erstinitialisierung: Mock-Daten laden und speichern');
        setWEGEinheiten(defaultWEGEinheiten);
        saveWEGEinheiten(defaultWEGEinheiten);
      }
      
      // Setze selectedWegId auf die erste Einheit
      const currentEinheiten = wegEinheiten.length > 0 ? wegEinheiten : defaultWEGEinheiten;
      if (currentEinheiten.length > 0) {
        const firstWegId = currentEinheiten[0].id;
        setSelectedWegId(firstWegId);
        console.log(`[Context] selectedWegId gesetzt auf: ${firstWegId}`);
      }
      
      console.log('[Context] WEG-Einheiten-Initialisierung abgeschlossen');
    } catch (error) {
      console.error('[Context] Fehler bei der Initialisierung der WEG-Einheiten:', error);
      // Fallback zu Mock-Daten bei Fehlern
      setWEGEinheiten(defaultWEGEinheiten);
      console.log('[Context] Fallback zu Mock-Daten bei Fehler');
    }
  };

  const initializeStammdaten = () => {
    try {
      // Prüfe ob gespeicherte Daten existieren
      if (hasStoredStammdaten()) {
        // Lade gespeicherte Daten
        const gespeicherteStammdaten = loadStammdaten();
        if (gespeicherteStammdaten) {
          console.log('Gespeicherte Stammdaten geladen');
          setStammdaten(gespeicherteStammdaten);
        } else {
          // Fallback zu Mock-Daten wenn gespeicherte Daten ungültig sind
          console.log('Keine gültigen gespeicherten Stammdaten gefunden, verwende Mock-Daten');
          setStammdaten(defaultStammdaten);
          saveStammdaten(defaultStammdaten);
        }
      } else {
        // Keine gespeicherten Daten vorhanden, verwende Mock-Daten und speichere sie
        console.log('Erstinitialisierung Stammdaten: Mock-Daten laden und speichern');
        setStammdaten(defaultStammdaten);
        saveStammdaten(defaultStammdaten);
      }
      setIsStammdatenInitialized(true);
    } catch (error) {
      console.error('Fehler bei der Initialisierung der Stammdaten:', error);
      // Fallback zu Mock-Daten bei Fehlern
      setStammdaten(defaultStammdaten);
      setIsStammdatenInitialized(true);
    }
  };

  const initializeKostenarten = () => {
    try {
      // Prüfe ob gespeicherte Daten existieren
      if (hasKostenarten()) {
        // Lade gespeicherte Daten
        const gespeicherteKostenarten = loadKostenarten();
        if (gespeicherteKostenarten.length > 0) {
          console.log(`${gespeicherteKostenarten.length} gespeicherte Kostenarten geladen`);
          setKostenarten(gespeicherteKostenarten);
        } else {
          // Fallback zu Mock-Daten wenn gespeicherte Daten leer sind
          console.log('Keine gespeicherten Kostenarten gefunden, verwende Mock-Daten');
          setKostenarten(defaultKostenarten);
          saveKostenarten(defaultKostenarten);
        }
      } else {
        // Keine gespeicherten Daten vorhanden, verwende Mock-Daten und speichere sie
        console.log('Erstinitialisierung Kostenarten: Mock-Daten laden und speichern');
        setKostenarten(defaultKostenarten);
        saveKostenarten(defaultKostenarten);
      }
      setIsKostenartenInitialized(true);
    } catch (error) {
      console.error('Fehler bei der Initialisierung der Kostenarten:', error);
      // Fallback zu Mock-Daten bei Fehlern
      setKostenarten(defaultKostenarten);
      setIsKostenartenInitialized(true);
    }
  };

  const initializeBelege = () => {
    try {
      // Prüfe ob gespeicherte Daten existieren
      if (hasBelege()) {
        // Lade gespeicherte Daten
        const gespeicherteBelege = loadBelege();
        if (gespeicherteBelege.length > 0) {
          console.log(`${gespeicherteBelege.length} gespeicherte Belege geladen`);
          setBelege(gespeicherteBelege);
        } else {
          // Keine gespeicherten Belege gefunden
          console.log('Keine gespeicherten Belege gefunden, verwende leeres Array');
          setBelege([]);
        }
      } else {
        // Keine gespeicherten Daten vorhanden, verwende leeres Array
        console.log('Erstinitialisierung Belege: Leeres Array setzen');
        setBelege([]);
      }
      setIsBelegeInitialized(true);
    } catch (error) {
      console.error('Fehler bei der Initialisierung der Belege:', error);
      // Fallback zu leerem Array bei Fehlern
      setBelege([]);
      setIsBelegeInitialized(true);
    }
  };

  const updateStammdaten = (newData: Partial<Stammdaten>) => {
    const updatedStammdaten = { ...stammdaten, ...newData };
    setStammdaten(updatedStammdaten);
    // Speichere sofort persistent
    try {
      saveStammdaten(updatedStammdaten);
    } catch (error) {
      console.error('Fehler beim Speichern der Stammdaten:', error);
    }
  };

  const updateWEGEinheit = (einheitId: string, patch: Partial<WEGEinheit>) => {
    console.log('updateWEGEinheit called:', { einheitId, patch });
    
    setWEGEinheiten(prev => {
      const next = prev.map(e =>
        e.id === einheitId ? { ...e, ...patch } : e
      );
      
      // Persistiere sofort
      try {
        saveWEGEinheiten(next);
        console.log('WEG-Einheit erfolgreich aktualisiert und gespeichert');
      } catch (error) {
        console.error('Fehler beim Speichern der WEG-Einheit:', error);
      }
      
      return next; // Triggers re-render für alle Subscriber
    });
  };

  const updateKostenarten = (kostenarten: Kostenart[]) => {
    setKostenarten(kostenarten);
    // Speichere sofort persistent
    try {
      saveKostenarten(kostenarten);
    } catch (error) {
      console.error('Fehler beim Speichern der Kostenarten:', error);
    }
  };

  const updateKostenart = (id: string, updates: Partial<Kostenart>) => {
    const updatedKostenarten = kostenarten.map(kostenart => 
      kostenart.id === id ? { ...kostenart, ...updates } : kostenart
    );
    setKostenarten(updatedKostenarten);
    // Speichere sofort persistent
    try {
      saveKostenarten(updatedKostenarten);
    } catch (error) {
      console.error('Fehler beim Speichern der Kostenart:', error);
    }
  };

  const selectWeg = (wegId: string) => {
    console.log('selectWeg called with:', wegId);
    setSelectedWegId(wegId);
  };

      const repairWEGEinheitenData = () => {
      const reparierteEinheiten = wegEinheiten.map(einheit => {
        const defaultEinheit = defaultWEGEinheiten.find(d => d.wohnungsnummer === einheit.wohnungsnummer);
        if (defaultEinheit && (!einheit.miteigentumsAnteil || !einheit.wohnflaeche)) {
          return {
            ...defaultEinheit,
            ...einheit,
            miteigentumsAnteil: einheit.miteigentumsAnteil || defaultEinheit.miteigentumsAnteil,
            wohnflaeche: einheit.wohnflaeche || defaultEinheit.wohnflaeche
          };
        }
        return einheit;
      });
      
      setWEGEinheiten(reparierteEinheiten);
      saveWEGEinheiten(reparierteEinheiten);
      console.log('WEG-Einheiten wurden repariert');
    };

  const loadZaehler = async (wegId: string) => {
    try {
      console.log(`Lade Zähler für WEG ${wegId}...`);
      const zaehlerData = await zaehlerService.list(wegId);
      
      // MERGE STRATEGIE: Server-Daten + Pending Creates + Aktuelle Context-Daten mit unionById
      let merged = zaehlerData;
      
      // WICHTIG: Füge aktuelle Context-Daten hinzu, um Verluste zu verhindern
      const currentContextZaehler = zaehler.filter(z => z.wegId === wegId);
      if (currentContextZaehler.length > 0) {
        console.log(`[LOAD MERGE] Aktuelle Context-Daten: ${currentContextZaehler.length} Zähler`);
        merged = unionById(merged, currentContextZaehler);
      }
      
      if (pendingCreatesRef.current.size > 0) {
        const pendings = Array.from(pendingCreatesRef.current.values());
        // unionById hält temp-Einträge zusätzlich drin,
        // bis Reconcile (create success) sie ersetzt/entfernt.
        merged = unionById(merged, pendings);
        console.log(`[LOAD MERGE] Server: ${zaehlerData.length}, Context: ${currentContextZaehler.length}, Pending: ${pendings.length}, Final: ${merged.length}`);
        console.log(`[LOAD MERGE] Pending IDs:`, Array.from(pendingCreatesRef.current.keys()));
      }
      
      // Niemals in-place mutieren, neue Referenz liefern
      setZaehler(_prev => merged);
      
      console.log(`${merged.length} Zähler für WEG ${wegId} geladen (inkl. Context-Daten)`);
    } catch (error) {
      console.error(`Fehler beim Laden der Zähler für WEG ${wegId}:`, error);
    }
  };

  const createZaehler = useCallback(async (wegId: string, zaehlerData: Partial<Zaehler>) => {
    const opId = ++opCounterRef.current;
    const tempId = `temp:${opId}:${crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

    const optimistic: OptimisticZaehler = {
      id: tempId,
      wegId,
      einheitId: zaehlerData.einheitId ?? 'allgemein',
      zaehlernummer: zaehlerData.zaehlernummer ?? '',
      bezeichnung: zaehlerData.bezeichnung ?? '',
      zaehlertyp: zaehlerData.zaehlertyp!,
      zaehlertypEinheit: zaehlerData.zaehlertypEinheit || (zaehlerData.zaehlertyp ? ZAHLERTYP_EINHEIT[zaehlerData.zaehlertyp] : undefined) || 'kWh',
      standort: zaehlerData.standort ?? '',
      notiz: undefined,
      startwert: null,
      ablesewert: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __temp: true,
      __opId: opId,
    };

    console.debug('[Context] createZaehler called', { wegId, zaehlerData, tempId, opId });

    // 1) Optimistic sofort in den Context-State
    pendingCreatesRef.current.set(tempId, optimistic);
    setZaehler(prev => [...prev, optimistic]);
    
    console.debug('[Context] Optimistic update mit tempId:', tempId);
    console.debug('[Context] Pending Creates aktualisiert:', Array.from(pendingCreatesRef.current.keys()));

    try {
      // 2) Servercall im Hintergrund (nicht in der UI awaiten)
      const serverItem = await zaehlerService.create(wegId, zaehlerData as Omit<Zaehler, "id" | "createdAt" | "updatedAt"> & { idemKey?: string });

      console.debug('[Context] Server-Response erhalten, reconcile tempId:', tempId, '→', serverItem.id);

      // 3) Reconcile: tempId -> echte ID ersetzen
      pendingCreatesRef.current.delete(tempId);
      
      // Zusätzliche Sicherheitsmaßnahme: Entferne alle temp-IDs mit demselben OpId
      // Das verhindert, dass alte temp-IDs im pendingCreatesRef verbleiben
      for (const [key, value] of pendingCreatesRef.current.entries()) {
        if (value.__opId === opId) {
          console.debug('[Context] Entferne alte temp-ID mit gleichem OpId:', key);
          pendingCreatesRef.current.delete(key);
        }
      }
      
      setZaehler(prev => {
        // Entferne den temp-Zähler und füge den echten Zähler hinzu
        const withoutTemp = prev.filter(z => z.id !== tempId);
        
        // Prüfe ob der echte Zähler bereits existiert
        const hasRealZaehler = withoutTemp.some(z => 
          z.wegId === serverItem.wegId && 
          z.einheitId === serverItem.einheitId && 
          z.zaehlernummer === serverItem.zaehlernummer && 
          z.zaehlertyp === serverItem.zaehlertyp
        );
        
        if (hasRealZaehler) {
          console.debug('[Context] Echter Zähler existiert bereits, verwende bestehenden');
          return withoutTemp;
        } else {
          console.debug('[Context] Füge echten Zähler hinzu');
          return [...withoutTemp, serverItem];
        }
      });

      console.debug('[Context] STRICT RECONCILE abgeschlossen, tempId ersetzt durch:', serverItem.id);

      // optional: sanfter Refresh, der pendings mitmergt
      void refreshZaehler(wegId);
      
      console.log(`Zähler für WEG ${wegId} erstellt (ID: ${serverItem.id})`);
      return serverItem;
    } catch (err) {
      // 4) Rollback bei Fehler
      pendingCreatesRef.current.delete(tempId);
      setZaehler(prev => prev.filter(z => z.id !== tempId));
      console.error(`Fehler beim Erstellen des Zählers für WEG ${wegId}:`, err);
      throw err;
    }
  }, []);

  const updateZaehler = async (wegId: string, zaehlerId: string, updates: Partial<Zaehler>) => {
    try {
      const updatedZaehler = await zaehlerService.update(wegId, zaehlerId, updates);
      
      // Aktualisiere den lokalen State und entferne Duplikate
      setZaehlerWithLog(prev => {
        const filtered = prev.filter(z => z.id !== zaehlerId);
        return [...filtered, updatedZaehler];
      });
      
      console.log(`Zähler ${zaehlerId} für WEG ${wegId} aktualisiert`);
      return updatedZaehler;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Zählers ${zaehlerId} für WEG ${wegId}:`, error);
      throw error;
    }
  };

  const deleteZaehler = async (wegId: string, zaehlerId: string) => {
    try {
      await zaehlerService.remove(wegId, zaehlerId);
      setZaehlerWithLog(prev => prev.filter(z => z.id !== zaehlerId));
      console.log(`Zähler ${zaehlerId} für WEG ${wegId} gelöscht`);
    } catch (relativePath) {
      console.error(`Fehler beim Löschen des Zählers ${zaehlerId} für WEG ${wegId}:`, relativePath);
      throw relativePath;
    }
  };

  const purgeAllZaehler = useCallback(async (wegId: string) => {
    try {
      const deletedCount = await zaehlerService.purgeAll(wegId);
      
      // Aktualisiere den lokalen State - alle Zähler für diese WEG entfernen
      setZaehler(prev => prev.filter(z => z.wegId !== wegId));
      
      // Lösche auch alle pendingCreates für diese WEG
      for (const [key, value] of pendingCreatesRef.current.entries()) {
        if (value.wegId === wegId) {
          pendingCreatesRef.current.delete(key);
        }
      }
      
      console.log(`${deletedCount} Zähler für WEG ${wegId} gelöscht`);
      return deletedCount;
    } catch (error) {
      console.error('Fehler beim Löschen aller Zähler:', error);
      throw error;
    }
  }, []);

  const refreshZaehler = async (wegId: string) => {
    try {
      const refreshedZaehler = await zaehlerService.list(wegId);
      
      // MERGE STRATEGIE: Server-Daten + Pending Creates + Aktuelle Context-Daten mit unionById
      let merged = refreshedZaehler;
      
      // WICHTIG: Füge aktuelle Context-Daten hinzu, um Verluste zu verhindern
      const currentContextZaehler = zaehler.filter(z => z.wegId === wegId);
      if (currentContextZaehler.length > 0) {
        console.log(`[REFRESH MERGE] Aktuelle Context-Daten: ${currentContextZaehler.length} Zähler`);
        merged = unionById(merged, currentContextZaehler);
      }
      
      if (pendingCreatesRef.current.size > 0) {
        const pendings = Array.from(pendingCreatesRef.current.values());
        // unionById hält temp-Einträge zusätzlich drin,
        // bis Reconcile (create success) sie ersetzt/entfernt.
        merged = unionById(merged, pendings);
        console.log(`[REFRESH MERGE] Server: ${refreshedZaehler.length}, Context: ${currentContextZaehler.length}, Pending: ${pendings.length}, Final: ${merged.length}`);
        console.log(`[REFRESH MERGE] Pending IDs:`, Array.from(pendingCreatesRef.current.keys()));
      }
      
      // 2) niemals in-place mutieren, neue Referenz liefern
      setZaehler(_prev => merged);
      
      // WICHTIG: Debug-Log für Prompt 5 - Navigation/Refresh darf nicht zurücksetzen
      console.debug('[REFRESH] serverList snapshot', refreshedZaehler.map(z => ({ id: z.id, start: z.startwert, ablese: z.ablesewert })));
      console.debug('[REFRESH] merged snapshot', merged.map(z => ({ id: z.id, start: z.startwert, ablese: z.ablesewert })));

      // WICHTIG: Debug-Log für Ziel 5 - Refresh/Navi darf nichts zurückdrehen
      const strohZaehler = merged.find(z => z.zaehlernummer === 'Stroh');
      if (strohZaehler) {
        console.debug('[REFRESH] Stroh Zähler nach Merge:', {
          id: strohZaehler.id,
          start: strohZaehler.startwert,
          ablese: strohZaehler.ablesewert,
          timestamp: new Date().toISOString()
        });
      }
      
      // WICHTIG: Lade auch die Zählerstände neu - das war der fehlende Teil!
      const refreshedZaehlerstaende = loadZaehlerstaende();
      setZaehlerstaende(refreshedZaehlerstaende);
      console.log(`[REFRESH] ${refreshedZaehlerstaende.length} Zählerstände neu geladen`);
      
      console.log(`Zähler für WEG ${wegId} neu geladen (inkl. Context-Daten)`);
    } catch (error) {
      console.error(`Fehler beim Neu laden der Zähler für WEG ${wegId}:`, error);
    }
  };

  // Ablesewerte
  const upsertReading = async (wegId: string, jahr: number, zaehlerId: string, values: { startwert?: number | null; ablesewert?: number | null; notiz?: string }) => {
    try {
      console.log(`[Context] upsertReading aufgerufen: wegId=${wegId}, jahr=${jahr}, zaehlerId=${zaehlerId}, values=`, values);
      
      // WICHTIG: Prüfe ob zaehlerId eine tempId ist und ersetze sie durch die echte ID
      let realZaehlerId = zaehlerId;
      if (zaehlerId.startsWith('temp:')) {
        // Finde den echten Zähler basierend auf der tempId
        const tempZaehler = zaehler.find(z => z.id === zaehlerId);
        if (tempZaehler) {
          // Verwende die tempId für den Service-Aufruf, aber der Service sollte das handhaben
          console.log(`[Context] Verwende tempId für upsertReading: ${zaehlerId}`);
        } else {
          console.error(`[Context] Temp-Zähler nicht gefunden: ${zaehlerId}`);
          throw new Error(`Temp-Zähler ${zaehlerId} nicht gefunden`);
        }
      }
      
      const updatedZaehler = await zaehlerService.upsertReading(wegId, jahr, realZaehlerId, values);
      setZaehlerWithLog(prev => prev.map(z => z.id === zaehlerId ? updatedZaehler : z));
      
      // WICHTIG: Aktualisiere auch zaehlerstaende für jahresspezifische Daten
      try {
        // Importiere die Storage-Funktionen direkt (kein dynamischer Import)
        const currentStaende = loadZaehlerstaende();
        
        console.log(`[Context] Aktuelle Zählerstände geladen: ${currentStaende.length} Einträge`);
        
        // Finde den bestehenden Zählerstand oder erstelle einen neuen
        let zaehlerstand = currentStaende.find(zs => zs.zaehlernummer === updatedZaehler.zaehlernummer && zs.jahr === jahr);
        
        if (zaehlerstand) {
          // Aktualisiere bestehenden Zählerstand
          const updatedStand = { 
            ...zaehlerstand, 
            startwert: values.startwert ?? zaehlerstand.startwert,
            ablesewert: values.ablesewert ?? zaehlerstand.ablesewert,
            notiz: values.notiz ?? zaehlerstand.notiz,
            updatedAt: new Date().toISOString() 
          };
          
          console.log(`[Context] Aktualisiere bestehenden Zählerstand:`, updatedStand);
          upsertZaehlerstand(updatedStand);
          
          // Aktualisiere den Context-State
          setZaehlerstaende(prev => prev.map((zs: any) => 
            zs.zaehlernummer === zaehlerstand.zaehlernummer && zs.jahr === zaehlerstand.jahr ? updatedStand : zs
          ));
        } else {
          // Erstelle neuen Zählerstand
          const newStand = {
            zaehlernummer: updatedZaehler.zaehlernummer,
            einheitId: updatedZaehler.einheitId,
            jahr,
            startwert: values.startwert ?? undefined,
            ablesewert: values.ablesewert ?? undefined,
            notiz: values.notiz ?? '',
            updatedAt: new Date().toISOString()
          };
          
          console.log(`[Context] Erstelle neuen Zählerstand:`, newStand);
          upsertZaehlerstand(newStand);
          
          // Füge zum Context-State hinzu
          setZaehlerstaende(prev => [...prev, newStand]);
        }
        
        // WICHTIG: Lade die aktualisierten Zählerstände aus dem Storage
        // Das stellt sicher, dass der Context-State mit dem Storage synchronisiert ist
        const updatedStaende = loadZaehlerstaende();
        console.log(`[Context] Aktualisierte Zählerstände aus Storage geladen: ${updatedStaende.length} Einträge`);
        
        // Aktualisiere den Context-State mit den aktuellen Daten aus dem Storage
        setZaehlerstaende(updatedStaende);
        
        // WICHTIG: Verifiziere, dass die Daten korrekt gespeichert wurden
        const verifyStand = updatedStaende.find(zs => zs.zaehlernummer === updatedZaehler.zaehlernummer && zs.jahr === jahr);
        
        if (verifyStand) {
          console.log(`[Context] ✅ Verifikation erfolgreich: Zählerstand gespeichert:`, verifyStand);
        } else {
          console.error(`[Context] ❌ Verifikation fehlgeschlagen: Zählerstand nicht gefunden!`);
        }
        
        console.log(`[Context] Zählerstand für ${updatedZaehler.zaehlernummer} Jahr ${jahr} aktualisiert`);
        
        // WICHTIG: Debug-Log für Prompt 4 - IndexedDB-Roundtrip direkt nach Save
        try {
          const z = await zaehlerService.getById(realZaehlerId);
          console.debug('[IDB-RDT]', {
            start: z?.startwert,
            ablese: z?.ablesewert
          });
        } catch (roundtripError) {
          console.warn('[IDB-RDT] Roundtrip fehlgeschlagen:', roundtripError);
        }

        // WICHTIG: Debug-Log für Ziel 4 - IndexedDB-Roundtrip prüfen
        try {
          const zaehlerList = await zaehlerService.list(wegId);
          const strohZaehler = zaehlerList.find(z => z.zaehlernummer === 'Stroh');
          if (strohZaehler) {
            console.debug('[IDB-ROUNDTRIP]', {
              zaehlernummer: strohZaehler.zaehlernummer,
              start: strohZaehler.startwert,
              ablese: strohZaehler.ablesewert,
              timestamp: new Date().toISOString()
            });
          }
        } catch (roundtripError) {
          console.warn('[IDB-ROUNDTRIP] Roundtrip fehlgeschlagen:', roundtripError);
        }
        
      } catch (error) {
        console.error('[Context] Fehler beim Aktualisieren der Zählerstände:', error);
        // WICHTIG: Bei Fehler trotzdem fortfahren, aber warnen
      }
      
      console.log(`[Context] Ablesewert für Zähler ${zaehlerId} in WEG ${wegId} für Jahr ${jahr} aktualisiert`);
      return updatedZaehler;
    } catch (error) {
      console.error(`[Context] Fehler beim Aktualisieren des Ablesewerts für Zähler ${zaehlerId} in WEG ${wegId} für Jahr ${jahr}:`, error);
      throw error;
    }
  };

  // Beleg-Management
  const createBeleg = async (belegData: Omit<Beleg, 'id' | 'createdAt' | 'updatedAt'>): Promise<Beleg> => {
    try {
      console.info('[CREATE] payload', belegData);
      
      // IMPORTANT: Storage-Funktion importieren, nicht rekursiv aufrufen
      const { createBeleg: createBelegStorage } = await import('../storage/belegStorage');
      const newBeleg = await createBelegStorage(belegData);
      
      console.info('[CREATE] response', newBeleg);
      
      // State aktualisieren
      setBelege(prev => [...prev, newBeleg]);
      
      // Automatische Umlage-Berechnung nach dem Speichern
      try {
        const { beleg: belegWithUmlage } = await UmlageService.processUmlage(newBeleg, wegEinheiten, 'auto');
        setBelege(prev => prev.map(b => b.id === newBeleg.id ? belegWithUmlage : b));
        return belegWithUmlage;
      } catch (umlageError) {
        console.warn('[Context] Umlage-Berechnung fehlgeschlagen, Beleg ohne Umlage gespeichert:', umlageError);
        return newBeleg;
      }
    } catch (error) {
      console.error('[CREATE] error', error);
      throw error;
    }
  };

  const updateBeleg = async (id: string, updates: Partial<Beleg>): Promise<Beleg | null> => {
    try {
      // IMPORTANT: Storage-Funktion importieren, nicht rekursiv aufrufen
      const { updateBeleg: updateBelegStorage } = await import('../storage/belegStorage');
      const updatedBeleg = await updateBelegStorage(id, updates);
      
      if (updatedBeleg) {
        // State aktualisieren
        setBelege(prev => prev.map(b => b.id === id ? updatedBeleg : b));
        
        // Automatische Umlage-Berechnung nach dem Update
        try {
          const { beleg: belegWithUmlage } = await UmlageService.processUmlage(updatedBeleg, wegEinheiten, 'auto');
          setBelege(prev => prev.map(b => b.id === id ? belegWithUmlage : b));
          return belegWithUmlage;
        } catch (umlageError) {
          console.warn('[Context] Umlage-Berechnung fehlgeschlagen, Beleg ohne Umlage aktualisiert:', umlageError);
          return updatedBeleg;
        }
      }
      return updatedBeleg;
    } catch (error) {
      console.error('[Context] Fehler beim Aktualisieren des Belegs:', error);
      throw error;
    }
  };

  const deleteBeleg = async (id: string): Promise<boolean> => {
    try {
      // IMPORTANT: Storage-Funktion importieren, nicht rekursiv aufrufen
      const { deleteBeleg: deleteBelegStorage } = await import('../storage/belegStorage');
      const success = await deleteBelegStorage(id);
      
      if (success) {
        setBelege(prev => prev.filter(b => b.id !== id));
      }
      return success;
    } catch (error) {
      console.error('[Context] Fehler beim Löschen des Belegs:', error);
      throw error;
    }
  };

  // Manuelle Umlage-Berechnung
  const recalculateUmlage = async (belegId: string): Promise<Beleg | null> => {
    try {
      const beleg = belege.find(b => b.id === belegId);
      if (!beleg) {
        throw new Error(`Beleg mit ID ${belegId} nicht gefunden`);
      }

      const { beleg: belegWithUmlage } = await UmlageService.processUmlage(beleg, wegEinheiten, 'manuell');
      setBelege(prev => prev.map(b => b.id === belegId ? belegWithUmlage : b));
      
      return belegWithUmlage;
    } catch (error) {
      console.error('[Context] Fehler bei der manuellen Umlage-Berechnung:', error);
      throw error;
    }
  };

  // Notizen aktualisieren (ohne andere Felder zu beeinflussen)
  const updateNote = async (wegId: string, zaehlerId: string, notiz: string) => {
    console.log(`[Context] updateNote aufgerufen: wegId=${wegId}, zaehlerId=${zaehlerId}, notiz="${notiz}"`);
    
    try {
      // Hole zuerst den aktuellen Zähler aus dem Context
      const currentZaehler = zaehler.find(z => z.id === zaehlerId);
      console.log(`[Context] Aktueller Zähler vor Update:`, {
        id: currentZaehler?.id,
        notiz: currentZaehler?.notiz,
        updatedAt: currentZaehler?.updatedAt
      });
      
      const updatedZaehler = await zaehlerService.updateNote(zaehlerId, notiz, wegId);
      
      console.log(`[Context] ZaehlerService.updateNote zurückgegeben:`, {
        id: updatedZaehler.id,
        notiz: updatedZaehler.notiz,
        updatedAt: updatedZaehler.updatedAt
      });
      
      // WICHTIG: Aktualisiere den Context-State mit dem aktualisierten Zähler
      setZaehlerWithLog(prev => {
        const updated = prev.map(z => z.id === zaehlerId ? updatedZaehler : z);
        console.log(`[Context] Context aktualisiert für Zähler ${zaehlerId}, neue Notiz: "${updatedZaehler.notiz}"`);
        return updated;
      });
      
      // WICHTIG: Warte kurz und prüfe dann, ob die Daten korrekt im Context sind
      setTimeout(() => {
        const verifyZaehler = zaehler.find(z => z.id === zaehlerId);
        console.log(`[Context] Verifikation nach 100ms:`, {
          id: verifyZaehler?.id,
          notiz: verifyZaehler?.notiz,
          updatedAt: verifyZaehler?.updatedAt
        });
        
        // WICHTIG: Prüfe, ob die Verifikation erfolgreich war
        if (verifyZaehler?.notiz !== notiz) {
          console.error(`[Context] FEHLER: Context-Verifikation fehlgeschlagen! Gespeichert: "${notiz}", Context: "${verifyZaehler?.notiz}"`);
        } else {
          console.log(`[Context] ✅ Context-Verifikation erfolgreich: "${notiz}"`);
        }
      }, 100);
      
      console.log(`[Context] Notiz für Zähler ${zaehlerId} in WEG ${wegId} aktualisiert: "${notiz}"`);
      return updatedZaehler;
    } catch (error) {
      console.error(`[Context] Fehler beim Aktualisieren der Notiz für Zähler ${zaehlerId} in WEG ${wegId}:`, error);
      throw error;
    }
  };

  const contextValue = useMemo(() => ({
    stammdaten,
    wegEinheiten,
    kostenarten,
    zaehler,
    zaehlerstaende,
    belege,
    selectedWegId,
    selectWeg,
    updateStammdaten,
    updateWEGEinheit,
    updateKostenarten,
    updateKostenart,
    repairWEGEinheitenData,
    // Zähler-Management
    loadZaehler: loadZaehler,
    createZaehler: createZaehler,
    updateZaehler: updateZaehler,
    deleteZaehler: deleteZaehler,
    purgeAllZaehler: purgeAllZaehler,
    refreshZaehler: refreshZaehler,
    // Beleg-Management
    createBeleg: createBeleg,
    updateBeleg: updateBeleg,
    deleteBeleg: deleteBeleg,
    recalculateUmlage: recalculateUmlage,
    // Ablesewerte
    upsertReading: upsertReading,
    updateNote: updateNote,
    reloadZaehlerstaende: reloadZaehlerstaende, // WICHTIG: Neue Funktion für Navigation
    loadZaehlerstaendeForYear: loadZaehlerstaendeForYear,
    debugFindAllZaehler: debugFindAllZaehler
  }), [
    stammdaten, wegEinheiten, kostenarten, zaehler, zaehlerstaende, belege, selectedWegId,
    selectWeg, updateStammdaten, updateWEGEinheit, updateKostenarten, updateKostenart,
    repairWEGEinheitenData, loadZaehler, createZaehler, updateZaehler, deleteZaehler,
    purgeAllZaehler, refreshZaehler, createBeleg, updateBeleg, deleteBeleg, recalculateUmlage,
    upsertReading, updateNote, reloadZaehlerstaende, loadZaehlerstaendeForYear, debugFindAllZaehler
  ]);

  return (
    <ImmobilienContext.Provider value={contextValue}>
      {children}
    </ImmobilienContext.Provider>
  );
};