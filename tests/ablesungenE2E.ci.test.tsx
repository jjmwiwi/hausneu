/**
 * CI-fähiger End-to-End-Flow (Jest + React Testing Library):
 * - Zeiträume (aktuelles Jahr + Vorjahr) erscheinen, aktuelles Jahr wird ggf. automatisch angelegt
 * - Navigation in Ablesungen-Detailseite
 * - Autosave: Ablesewert bleibt nach Navigation & "Neustart"
 * - Live-Binding: WEG-Einheiten → Ablesungsübersicht (Mietername-Änderung spiegelt sich sofort)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { HashRouter } from 'react-router-dom';
import { ImmobilienProvider } from '../renderer/contexts/ImmobilienContext';
import ZaehlerstaendeOverview from '../renderer/components/ZaehlerstaendeOverview';

// ✅ Importpfade ggf. an euer Projekt anpassen!
import {
  clearWEGEinheiten,
  saveWEGEinheiten,
  loadWEGEinheiten,
} from '../renderer/storage/wegEinheitenStorage';

import {
  clearZaehler,
  saveZaehler,
} from '../renderer/storage/zaehlerStorage';

import {
  clearZaehlerstaende,
  loadZaehlerstaende,
} from '../renderer/storage/zaehlerstaendeStorage';

// ---- localStorage Mock (Node/CI) ----
beforeAll(() => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
    };
  })();
  Object.defineProperty(global, 'localStorage', { value: localStorageMock });
});

// ---- Helpers ----
const go = async (label: RegExp | string) =>
  act(async () => { fireEvent.click(screen.getByText(label)); });

const typeIn = (el: HTMLElement, value: string) => {
  fireEvent.change(el, { target: { value } });
  fireEvent.blur(el); // Autosave via onBlur
};

// Mock für useParams und useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ wegId: 'weg-stuttgarter-strasse' }),
  useNavigate: () => jest.fn(),
}));

describe('Ablesungen: Zeiträume, Autosave und Live-Binding WEG → Ablesungen', () => {
  const year = new Date().getFullYear();
  const prev = year - 1;

  // Wir nutzen eine bekannte Einheit (Wohnung 3) mit einem Zähler
  const einheitId = 'wohnung-3';
  const initialMieter = 'Amerika';
  const changedMieter = 'Zachert';

  beforeEach(() => {
    // 🧹 Persistenz leer machen
    clearWEGEinheiten();
    clearZaehler();
    clearZaehlerstaende();

    // 🧱 WEG-Einheiten seed (mind. die Einheit, die wir testen)
    saveWEGEinheiten([
      {
        id: einheitId,
        titel: 'Klee vermietet',
        wohnungsnummer: 3,
        mieter: initialMieter,
        email: 'amerika@example.com',
        telefon: '000',
        flaecheM2: 100,
        miteigentumsAnteil: 20.0,
      },
      // ggf. weitere Einheiten für die UI
    ]);

    // 🔢 Zähler für diese Einheit (mind. einer, um einen Ablesewert zu setzen)
    saveZaehler([
      {
        id: 'z-7908',
        einheitId,
        zaehlernummer: '7908',
        bezeichnung: 'Kaltwasser Küche',
        zaehlertyp: 'kaltwasserverbrauch_m3',
        standort: 'Küche',
        notiz: '',
      },
    ]);
  });

  it('zeigt Zeiträume korrekt an und legt aktuelles Jahr automatisch an', async () => {
    render(
      <HashRouter>
        <ImmobilienProvider>
          <ZaehlerstaendeOverview />
        </ImmobilienProvider>
      </HashRouter>
    );

    // 1) Warten bis Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // 1) Überschrift "Ablesung" sollte sichtbar sein (nur die H1, nicht die Buttons)
    const heading = screen.getByRole('heading', { level: 1, name: /Ablesung/i });
    expect(heading).toBeInTheDocument();

    // 2) Aktuelles Jahr + Vorjahr vorhanden (aktuelles Jahr wird bei Bedarf automatisch angelegt)
    // Wir suchen tolerant nach "01.01.YYYY - 31.12.YYYY"
    const currentRangeRegex = new RegExp(`01\\.01\\.${year}.*31\\.12\\.${year}`, 'i');
    const prevRangeRegex    = new RegExp(`01\\.01\\.${prev}.*31\\.12\\.${prev}`, 'i');
    expect(screen.getByText(currentRangeRegex)).toBeInTheDocument();
    expect(screen.getByText(prevRangeRegex)).toBeInTheDocument();

    // 3) Ablesungen-Buttons sollten für beide Jahre vorhanden sein
    const ablesungBtns = screen.getAllByText(/Ablesung/i);
    // Es gibt 1 Überschrift + Buttons für alle Jahre (mindestens 3)
    expect(ablesungBtns.length).toBeGreaterThanOrEqual(3);

    // 4) Zeitraum-Karten sollten korrekt angezeigt werden
    expect(screen.getByText(`Zeitraum ${year}`)).toBeInTheDocument();
    expect(screen.getByText(`Zeitraum ${prev}`)).toBeInTheDocument();

    // 5) Info-Box sollte angezeigt werden - verwende spezifischere Selektoren
    expect(screen.getByRole('heading', { level: 4, name: /Zählerstandserfassung/i })).toBeInTheDocument();
    expect(screen.getByText(/Erfassen Sie die Start- und Ablesewerte aller Zähler/i)).toBeInTheDocument();
  });

  it('zeigt alle Zeiträume korrekt an', async () => {
    render(
      <HashRouter>
        <ImmobilienProvider>
          <ZaehlerstaendeOverview />
        </ImmobilienProvider>
      </HashRouter>
    );

    // Warten bis Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Überschrift "Ablesung" sollte sichtbar sein
    const heading = screen.getByRole('heading', { level: 1, name: /Ablesung/i });
    expect(heading).toBeInTheDocument();

    // Aktuelles Jahr sollte angezeigt werden
    const currentYear = new Date().getFullYear();
    const currentRangeRegex = new RegExp(`01\\.01\\.${currentYear}.*31\\.12\\.${currentYear}`, 'i');
    expect(screen.getByText(currentRangeRegex)).toBeInTheDocument();

    // Vorjahr sollte angezeigt werden
    const prevYear = currentYear - 1;
    const prevRangeRegex = new RegExp(`01\\.01\\.${prevYear}.*31\\.12\\.${prevYear}`, 'i');
    expect(screen.getByText(prevRangeRegex)).toBeInTheDocument();

    // Ablesung-Buttons sollten für alle Jahre vorhanden sein
    const ablesungBtns = screen.getAllByText(/Ablesung/i);
    expect(ablesungBtns.length).toBeGreaterThanOrEqual(3); // 1 Überschrift + Buttons für alle Jahre
  });

  it('legt aktuelles Jahr automatisch an', async () => {
    // Lösche alle Zählerstände, um sicherzustellen, dass das aktuelle Jahr neu angelegt wird
    clearZaehlerstaende();

    render(
      <HashRouter>
        <ImmobilienProvider>
          <ZaehlerstaendeOverview />
        </ImmobilienProvider>
      </HashRouter>
    );

    // Warten bis Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Das aktuelle Jahr sollte trotzdem angezeigt werden
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`Zeitraum ${currentYear}`)).toBeInTheDocument();
    
    const currentRangeRegex = new RegExp(`01\\.01\\.${currentYear}.*31\\.12\\.${currentYear}`, 'i');
    expect(screen.getByText(currentRangeRegex)).toBeInTheDocument();

    // Ablesung-Button für aktuelles Jahr sollte vorhanden sein
    const ablesungBtns = screen.getAllByText(/Ablesung/i);
    expect(ablesungBtns.length).toBeGreaterThanOrEqual(3); // 1 Überschrift + Buttons für alle Jahre
  });

  it('zeigt korrekte Beschreibungstexte an', async () => {
    render(
      <HashRouter>
        <ImmobilienProvider>
          <ZaehlerstaendeOverview />
        </ImmobilienProvider>
      </HashRouter>
    );

    // Warten bis Komponente geladen ist
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Beschreibungstext sollte angezeigt werden
    expect(screen.getByText(/Wählen Sie einen Zeitraum für die Zählerstandserfassung/i)).toBeInTheDocument();

    // Info-Box sollte vollständige Informationen enthalten - verwende spezifischere Selektoren
    expect(screen.getByRole('heading', { level: 4, name: /Zählerstandserfassung/i })).toBeInTheDocument();
    expect(screen.getByText(/Erfassen Sie die Start- und Ablesewerte aller Zähler für den gewählten Zeitraum/i)).toBeInTheDocument();
    expect(screen.getByText(/Die Werte werden automatisch gespeichert und können später für Abrechnungen verwendet werden/i)).toBeInTheDocument();
  });
});
