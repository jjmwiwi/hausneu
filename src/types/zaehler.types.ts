export enum ZaehlerTyp {
  STROM = 'STROM',
  KALTWASSER = 'KALTWASSER',
  WARMWASSER = 'WARMWASSER',
  WMZ_HEIZUNG = 'WMZ_HEIZUNG',
  WMZ_WARMWASSER = 'WMZ_WARMWASSER',
  SONSTIGES = 'SONSTIGES',
}

export const ZAHLERTYP_LABEL: Record<ZaehlerTyp, string> = {
  STROM: 'Strom (kWh)',
  KALTWASSER: 'Kaltwasser (m³)',
  WARMWASSER: 'Warmwasser (m³)',
  WMZ_HEIZUNG: 'Wärmemenge Heizung (MWh)',
  WMZ_WARMWASSER: 'Wärmemenge Warmwasser (MWh)',
  SONSTIGES: 'Sonstiges',
};

export const ZAHLERTYP_EINHEIT: Record<ZaehlerTyp, string | null> = {
  STROM: 'kWh',
  KALTWASSER: 'm³',
  WARMWASSER: 'm³',
  WMZ_HEIZUNG: 'MWh',
  WMZ_WARMWASSER: 'MWh',
  SONSTIGES: null,
};

export interface Zaehler {
  id: string;
  wegId: string;              // WEG-ID für Zuordnung
  einheitId: string;          // 'allgemein' für Gemeinschaft
  zaehlernummer: string;
  bezeichnung: string;
  zaehlertyp: ZaehlerTyp;
  zaehlertypEinheit: string | null; // z.B. 'kWh', 'm³', 'MWh'
  standort?: string;
  notiz?: string;              // einheitliche Notiz-Quelle!
  startwert?: number | null;   // Startwert für Ablesungen
  ablesewert?: number | null;  // Aktueller Ablesewert
  createdAt: string;
  updatedAt: string;
}

export interface Einheit {
  id: string;
  name: string;
  mieterName?: string;
  ordnung?: number; // für Sortierung
  wohnungsnummer?: number;
  titel?: string;
  mieter?: string;
}
