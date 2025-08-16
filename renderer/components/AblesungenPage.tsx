import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useImmobilien } from '../contexts/ImmobilienContext';
import { createEinheitenForUI, groupAndSortZaehler } from '../utils/zaehlerUtils';
import { PageTitle } from './ui/PageTitle';
import DebugPageId from './ui/DebugPageId';
import { PAGE_IDS } from '../../src/constants/pageIds';
import { Zaehler } from '../../src/types/zaehler.types';

// Typen für Ablesewerte
interface Ablesung {
  zaehlerId: string;
  startwert: number | null;
  ablesewert: number | null;
  notiz: string;
  timestamp: string;
}

interface AblesungenPageProps {}

const AblesungenPage: React.FC<AblesungenPageProps> = () => {
  const { wegId, jahr } = useParams<{ wegId: string; jahr: string }>();
  const navigate = useNavigate();
  const { zaehler, wegEinheiten, zaehlerstaende, upsertReading, refreshZaehler, updateZaehler, updateNote, reloadZaehlerstaende, loadZaehlerstaendeForYear } = useImmobilien();
  
  // Lokale States für UI
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, Record<string, 'saving' | 'saved' | 'error' | undefined>>>({});
  const [localZaehler, setLocalZaehler] = useState<Zaehler[]>([]);
  
  // Refs
  const mounted = useRef(true);
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // WICHTIG: Neue Funktion für Prompt F - Debug-Log für Timer-Status
  const logTimerStatus = (zaehlerId: string, field: string, action: 'created' | 'cleared' | 'flushed') => {
    const timerKey = `${zaehlerId}-${field}`;
    const hasTimer = !!saveTimeoutRef.current[timerKey];
    console.debug('[TIMER:STATUS]', {
      zaehlerId,
      field,
      action,
      timerKey,
      hasTimer,
      allTimers: Object.keys(saveTimeoutRef.current)
    });
  };

  // WICHTIG: Neue Funktion für Ziel 8 - Debounce/Blur dürfen das andere Feld nicht "flushen"
  const logDebounceStatus = (zaehlerId: string, field: string, action: 'debounce_start' | 'debounce_flush' | 'blur_flush') => {
    const timerKey = `${zaehlerId}-${field}`;
    const hasTimer = !!saveTimeoutRef.current[timerKey];
    console.debug('[DEBOUNCE:STATUS]', {
      zaehlerId,
      field,
      action,
      timerKey,
      hasTimer,
      otherTimers: Object.keys(saveTimeoutRef.current).filter(k => k !== timerKey)
    });
  };

  // WICHTIG: Debug-Log für Ziel 1 - Feld-Props und Events verifizieren
  const logFieldProps = (id: string, kind: 'start' | 'ablese', value: any, disabled: boolean, readOnly: boolean, pointerEvents: string, tabIndex: number, hasOnChange: boolean) => {
    console.debug('[FIELD PROPS]', { 
      id, 
      kind, 
      value, 
      disabled, 
      readOnly, 
      pointerEvents, 
      tabIndex, 
      onChange: hasOnChange 
    });
  };

  const logFieldEvent = (kind: 'start' | 'ablese', type: 'focus' | 'keydown' | 'change' | 'blur', id: string, value: any) => {
    console.debug('[FIELD EVT]', { 
      kind, 
      type, 
      id, 
      value 
    });
  };

  // WICHTIG: Debug-Log für Ziel 4 - Controlled Value Hydration
  const logHydration = (id: string, kind: 'start' | 'ablese', displayValue: any, persistedValue: any) => {
    console.debug('[HYDRATE]', { 
      id, 
      kind, 
      displayValue, 
      persistedValue 
    });
  };

  // WICHTIG: Debug-Log für Ziel 5 - Save Lock Status
  const logSaveLock = (phase: 'before' | 'after', id: string, locked: boolean) => {
    console.debug('[SAVE LOCK]', { 
      phase, 
      id, 
      locked 
    });
  };

  // WICHTIG: Debug-Log für Ziel 6 - Input Type Test
  const logInputTypeTest = (kind: 'start' | 'ablese', previousType: string, nowTextEditable: boolean) => {
    console.debug('[INPUT TYPE TEST]', { 
      kind, 
      previousType, 
      nowTextEditable 
    });
  };

  // WICHTIG: Debug-Log für Ziel 7 - IME Composition
  const logComposition = (kind: 'start' | 'ablese', phase: 'start' | 'end', value: any) => {
    console.debug('[IME COMPOSITION]', { 
      kind, 
      phase, 
      value 
    });
  };

  // WICHTIG: Debug-Log für Ziel 8 - Row Render
  const logRowRender = (id: string, key: string, depsChanged: boolean) => {
    console.debug('[ROW RENDER]', { 
      id, 
      key, 
      depsChanged 
    });
  };

  // WICHTIG: Debug-Log für Ziel 2 - Alle möglichen Sperren identifizieren
  const logFieldLocks = (id: string, kind: 'start' | 'ablese', element: HTMLInputElement) => {
    const computedStyle = window.getComputedStyle(element);
    const locks = {
      id,
      kind,
      // Props
      disabled: element.disabled,
      readOnly: element.readOnly,
      'aria-disabled': element.getAttribute('aria-disabled'),
      tabIndex: element.tabIndex,
      // Styles
      pointerEvents: computedStyle.pointerEvents,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex,
      // CSS Classes
      hasFormControl: element.classList.contains('form-control'),
      hasDisabledClass: element.classList.contains('disabled'),
      // Overlay detection
      hasOverlay: element.parentElement?.querySelector('[style*="z-index"]') !== null,
      hasBackdrop: element.parentElement?.querySelector('[style*="backdrop"]') !== null
    };
    
    console.debug('[FIELD LOCKS]', locks);
    
    // WICHTIG: Warnung bei gefundenen Sperren
    if (locks.disabled || locks.readOnly || locks['aria-disabled'] === 'true' || 
        locks.tabIndex === -1 || locks.pointerEvents === 'none' || 
        locks.opacity === '0' || locks.hasDisabledClass) {
      console.warn('[FIELD LOCKS] ⚠️ GEFUNDENE SPERRE:', locks);
    }
  };

  // WICHTIG: Debug-Log für Ziel 3 - Key/Event-Blocker identifizieren
  const logKeyBlockers = (kind: 'start' | 'ablese', event: React.KeyboardEvent<HTMLInputElement>, targetTestId: string) => {
    const blockers = {
      key: event.key,
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      alt: event.altKey,
      targetTestId,
      // Event-Status
      defaultPrevented: event.defaultPrevented,
      // Spezielle Tasten
      isEnter: event.key === 'Enter',
      isTab: event.key === 'Tab',
      isEscape: event.key === 'Escape',
      isNumber: /^[0-9]$/.test(event.key),
      isComma: event.key === ',',
      isDot: event.key === '.',
      isBackspace: event.key === 'Backspace',
      isDelete: event.key === 'Delete'
    };
    
    console.debug('[KEYBLOCK]', blockers);
    
    // WICHTIG: Warnung bei blockierten Tasten
    if (event.defaultPrevented) {
      console.warn('[KEYBLOCK] ⚠️ EVENT WURDE BLOCKIERT:', blockers);
    }
    
    // WICHTIG: Warnung bei blockierten Zahlen/Komma
    if (blockers.isNumber || blockers.isComma || blockers.isDot) {
      if (event.defaultPrevented) {
        console.error('[KEYBLOCK] ❌ KRITISCH: Zahlen/Komma werden blockiert!');
      } else {
        console.log('[KEYBLOCK] ✅ Zahlen/Komma werden durchgelassen');
      }
    }
  };

  // Jahr als Zahl
  const jahrNumber = parseInt(jahr || '2025', 10);

  // Hilfsfunktion für Status-Updates
  const updateSaveStatus = (zaehlerId: string, field: string, status: 'saving' | 'saved' | 'error' | undefined) => {
    console.log(`[Ablesungen] updateSaveStatus: ${zaehlerId}.${field} = ${status}`);
    setSaveStatus(prev => {
      const newStatus = {
        ...prev,
        [zaehlerId]: {
          ...prev[zaehlerId],
          [field]: status
        }
      };
      console.log(`[Ablesungen] Neuer saveStatus:`, newStatus[zaehlerId]);
      return newStatus;
    });
  };

  // Plausibilitätsprüfung: Startwert ≤ Ablesewert
  const checkPlausibility = (zaehlerId: string, startwert: number | null, ablesewert: number | null): boolean => {
    if (startwert !== null && ablesewert !== null) {
      return startwert <= ablesewert;
    }
    return true; // Keine Prüfung möglich, wenn einer der Werte fehlt
  };

  // Hilfsfunktion für Plausibilitätsfehler
  const hasPlausibilityError = (zaehlerId: string): boolean => {
    // Verwende zuerst die lokalen Daten, dann die aus dem Context
    const currentZaehler = localZaehler.find(z => z.id === zaehlerId) || zaehler.find(z => z.id === zaehlerId);
    if (!currentZaehler) return false;
    
    return !checkPlausibility(zaehlerId, currentZaehler.startwert ?? null, currentZaehler.ablesewert ?? null);
  };

  // Hilfsfunktion für Status-Abfrage
  const getSaveStatus = (zaehlerId: string, field: string): 'saving' | 'saved' | 'error' | undefined => {
    return saveStatus[zaehlerId]?.[field];
  };

  // WICHTIG: Parser de-DE mit Debug-Logging für Prompt 2
  const parseGermanNumber = (value: string): number | null => {
    const raw = value;
    let parsed: number | null;
    
    if (value === '') {
      parsed = null;
    } else {
      // Ersetze Komma durch Punkt und konvertiere zu Zahl
      parsed = parseFloat(value.replace(',', '.'));
      // Prüfe ob parseFloat einen gültigen Wert zurückgegeben hat
      if (isNaN(parsed)) {
        parsed = null;
      }
    }
    
    // Debug-Log für Prompt 2
    console.debug('[PARSE]', { raw, parsed });
    
    return parsed;
  };

  // WICHTIG: Parser-Edgecases ausschließen für Prompt E
  const parseGermanNumberWithKey = (value: string, fieldKey: string): number | null => {
    const raw = value;
    let parsed: number | null;

    // WICHTIG: Debug-Log für Ziel 6 - Parser/Format: "8" darf nicht zu undefined/leer werden
    console.debug('[PARSE]', { raw, fieldKey });

    if (value === '' || value.trim() === '') {
      parsed = null;
      console.debug('[PARSE:EDGECASE]', { raw, parsed, sentKey: false, reason: 'empty string or whitespace only' });
    } else {
      // Verbesserte Behandlung deutscher Zahlenformate
      // Entferne alle Leerzeichen und ersetze Komma durch Punkt
      const cleanValue = value.trim().replace(/\s/g, '').replace(',', '.');
      parsed = parseFloat(cleanValue);
      
      if (isNaN(parsed)) {
        parsed = null;
        console.debug('[PARSE:EDGECASE]', { raw, parsed, sentKey: false, reason: 'NaN after parseFloat', cleanValue });
      } else {
        console.debug('[PARSE:EDGECASE]', { raw, parsed, sentKey: true, reason: 'valid number', cleanValue });
      }
    }

    // WICHTIG: Debug-Log für Ziel 6 - Finale Parsing-Ergebnisse
    console.debug('[PARSE:RESULT]', {
      raw,
      parsed,
      fieldKey,
      willSend: parsed !== null,
      type: typeof parsed
    });

    return parsed;
  };

  // Debug-Log beim Mount
  useEffect(() => {
    console.log('[Ablesungen] Mount', { wegId, jahr: jahrNumber, wegEinheitenCount: wegEinheiten?.length });
    
    return () => {
      mounted.current = false;
      // Alle Timeouts löschen
      Object.values(saveTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, [wegId, jahrNumber, wegEinheiten?.length]);

  // Einheiten für UI erstellen
  useEffect(() => {
    if (wegEinheiten && wegEinheiten.length > 0) {
      const uiEinheiten = createEinheitenForUI(wegEinheiten);
      // setLocalEinheiten(uiEinheiten); // Removed local state
      console.log('[Ablesungen] Einheiten erstellt', {
        count: uiEinheiten.length,
        ids: uiEinheiten.map(e => e.id),
        allgemeinExists: uiEinheiten.some(e => e.id === 'allgemein')
      });
    }
  }, [wegEinheiten]);

  // Zähler laden und jahresspezifische Daten laden
  useEffect(() => {
    const load = async () => {
      if (!wegId || !mounted.current) return;
      
      console.log('[Ablesungen] Starte Laden der Zähler', { wegId, jahr: jahrNumber });
      
      try {
        // WICHTIG: Wenn keine Zähler im Context sind, versuche sie zu laden
        if (!zaehler || zaehler.length === 0) {
          console.log('[Ablesungen] Keine Zähler im Context, versuche sie zu laden...');
          
          // Versuche Zähler zu laden
          try {
            await refreshZaehler(wegId);
            console.log('[Ablesungen] Zähler über refreshZaehler geladen');
          } catch (refreshError) {
            console.warn('[Ablesungen] refreshZaehler fehlgeschlagen:', refreshError);
          }
          
          // Warte kurz und prüfe nochmal
          setTimeout(() => {
            if (mounted.current && (!zaehler || zaehler.length === 0)) {
              console.log('[Ablesungen] Immer noch keine Zähler, setze leeren Zustand');
              setLocalZaehler([]);
            }
          }, 1000);
          
          return;
        }
        
        console.log('[Ablesungen] Zähler aus Context geladen:', zaehler);
        
        // WICHTIG: Lade jahresspezifische Daten für das aktuelle Jahr
        // Verwende die neue Funktion loadZaehlerstaendeForYear für bessere Performance
        const jahrStaende = loadZaehlerstaendeForYear(jahrNumber);
        console.log(`[Ablesungen] ${jahrStaende.length} Zählerstände für Jahr ${jahrNumber} geladen`);
        
        // Aktualisiere die Zähler mit den jahresspezifischen Daten
        const zaehlerMitJahresdaten = zaehler.map(zaehler => {
          const zaehlerstand = jahrStaende.find(zs => zs.zaehlernummer === zaehler.zaehlernummer);
          
          // WICHTIG: Debug-Log für Ziel 8 - Row Render
          logRowRender(zaehler.id, zaehler.id, false);
          
          if (zaehlerstand) {
            // WICHTIG: Verwende IMMER die jahresspezifischen Daten, nicht die Stammdaten
            return {
              ...zaehler,
              startwert: zaehlerstand.startwert !== undefined ? zaehlerstand.startwert : null,
              ablesewert: zaehlerstand.ablesewert !== undefined ? zaehlerstand.ablesewert : null,
              notiz: zaehlerstand.notiz || ''
            };
          }
          
          // WICHTIG: Wenn keine jahresspezifischen Daten existieren, setze alle Werte auf null
          // Das stellt sicher, dass Ablesungen immer individuell pro Zeitraum sind
          return {
            ...zaehler,
            startwert: null,
            ablesewert: null,
            notiz: ''
          };
        });
        
        // WICHTIG: Aktualisiere den lokalen Zustand mit den jahresspezifischen Daten
        setLocalZaehler(zaehlerMitJahresdaten);
        console.log('[Ablesungen] Lokaler Zustand mit jahresspezifischen Daten aktualisiert');
        
        console.log('[Ablesungen] Fertig geladen:', zaehler.length, 'Zähler');
        
        // PERFORMANCE PROBE: Bei 300+ Zählern Input-Latenz messen
        if (zaehler.length >= 300) {
          console.log(`[PERFORMANCE] Große Zähler-Liste: ${zaehler.length} Zähler`);
          console.log(`[PERFORMANCE] Input-Latenz wird überwacht - bei >100ms wird Row-Virtualization empfohlen`);
        }
      } catch (err) {
        console.error('[Ablesungen] Fehler beim Laden:', err);
        if (mounted.current) {
          setLocalZaehler([]);
        }
      }
    };

    load();
  }, [zaehler, wegId, jahrNumber, loadZaehlerstaendeForYear, refreshZaehler]);

  // WICHTIG: Lade Zählerstände neu, wenn sich das Jahr ändert
  useEffect(() => {
    if (wegId && jahrNumber && zaehler && zaehler.length > 0) {
      console.log(`[Ablesungen] Jahr geändert auf ${jahrNumber}, lade Zählerstände neu`);
      
      // Lade die Zählerstände für das neue Jahr
      const jahrStaende = loadZaehlerstaendeForYear(jahrNumber);
      console.log(`[Ablesungen] ${jahrStaende.length} Zählerstände für Jahr ${jahrNumber} geladen`);
      
      // Aktualisiere die Zähler mit den jahresspezifischen Daten
      const zaehlerMitJahresdaten = zaehler.map(zaehler => {
        const zaehlerstand = jahrStaende.find(zs => zs.zaehlernummer === zaehler.zaehlernummer);
        
        if (zaehlerstand) {
          // WICHTIG: Verwende IMMER die jahresspezifischen Daten, nicht die Stammdaten
          return {
            ...zaehler,
            startwert: zaehlerstand.startwert !== undefined ? zaehlerstand.startwert : null,
            ablesewert: zaehlerstand.ablesewert !== undefined ? zaehlerstand.ablesewert : null,
            notiz: zaehlerstand.notiz || ''
          };
        }
        
        // WICHTIG: Wenn keine jahresspezifischen Daten existieren, setze alle Werte auf null
        // Das stellt sicher, dass Ablesungen immer individuell pro Zeitraum sind
        return {
          ...zaehler,
          startwert: null,
          ablesewert: null,
          notiz: ''
        };
      });
      
      // WICHTIG: Aktualisiere den lokalen Zustand mit den jahresspezifischen Daten
      setLocalZaehler(zaehlerMitJahresdaten);
      console.log('[Ablesungen] Lokaler Zustand für neues Jahr aktualisiert');
    }
  }, [jahrNumber, wegId, zaehler, loadZaehlerstaendeForYear]);

  // Gruppierung der Zähler
  const groups = useMemo(() => {
    console.log('🔍 [Ablesungen] DEBUG: Starte Gruppierung', {
      zaehlerCount: zaehler?.length || 0, // Use zaehler from context
      einheitenCount: wegEinheiten?.length || 0,
      wegEinheitenCount: wegEinheiten?.length || 0
    });

    try {
      if (!zaehler || !wegEinheiten) { // Use zaehler and wegEinheiten from context
        console.log('🔍 [Ablesungen] DEBUG: Keine Daten für Gruppierung');
        return [];
      }

      const grouped = groupAndSortZaehler(zaehler, wegEinheiten); // Use zaehler and wegEinheiten from context
      
      console.log('🔍 [Ablesungen] DEBUG: Zähler gruppiert', {
        bucketsCount: grouped.length,
        buckets: grouped.map(g => ({
          einheitId: g.einheit?.id,
          einheitName: g.einheit?.titel || g.einheit?.name,
          itemsCount: g.items.length
        }))
      });

      return grouped;
    } catch (err) {
      console.error('🔍 [Ablesungen] DEBUG: Fehler bei Gruppierung:', err);
      return [];
    }
  }, [zaehler, wegEinheiten]); // Depend on zaehler and wegEinheiten from context

  // Debug-Log für Gruppierung
  useEffect(() => {
    console.debug('[ABLESUNGEN] count', zaehler?.length || 0, { wegId, jahr: jahrNumber, gruppen: groups.length }); // Use zaehler from context
    console.debug('[LIST] zaehler ids', zaehler?.map(z => z.id)); // Use zaehler from context
  }, [zaehler, wegId, jahrNumber, groups]); // Depend on zaehler from context

  // Sortiere Einheiten: Allgemein zuerst, dann nach Wohnungsnummer
  const sortedEinheiten = useMemo(() => {
    return [...wegEinheiten].sort((a, b) => {
      if (a.id === 'allgemein') return -1;
      if (b.id === 'allgemein') return 1;
      return (a.wohnungsnummer || 0) - (b.wohnungsnummer || 0);
    });
  }, [wegEinheiten]);

  // Hilfsfunktionen für Zahleneingabe
  const formatGermanNumber = (value: number | null): string => {
    if (value === null || value === undefined) return '';
    return value.toString().replace('.', ',');
  };

  // Event-Handler für Eingabefelder
  const handleStartwertChange = (zaehlerId: string, value: string) => {
    const numValue = parseGermanNumberWithKey(value, 'startwert');
    
    // Aktualisiere den lokalen Zustand für optimistische Updates
    setLocalZaehler(prev => prev.map(z => 
      z.id === zaehlerId 
        ? { ...z, startwert: numValue }
        : z
    ));
    
    // Validiere die Ablesung nach der Aktualisierung
    const currentZaehler = localZaehler.find(z => z.id === zaehlerId);
    if (currentZaehler) {
      validateAblesung(zaehlerId, numValue, currentZaehler.ablesewert ?? null);
    }
    
    // Setze Status auf 'saving' NUR für das Startwert-Feld
    updateSaveStatus(zaehlerId, 'startwert', 'saving');
    
    // WICHTIG: Debug-Log für Ziel 1 - belege, dass nur startwert gesendet wird
    const values = { startwert: numValue };
    const sentKeys = Object.keys(values).filter(key => values[key as keyof typeof values] !== undefined);
    console.debug('[SAVE->START]', {
      id: zaehlerId,
      raw: value,
      parsed: numValue,
      sentKeys,
      hasStart: Object.prototype.hasOwnProperty.call(values,'startwert'),
      hasAblese: Object.prototype.hasOwnProperty.call(values,'ablesewert')
    });

    // WICHTIG: Debug-Log für Ziel 3 - Zeitraum/Jahr prüfen
    console.debug('[SAVE] context { jahrActive }', { jahrActive: jahrNumber });

    // WICHTIG: Speichere auch leere Werte (numValue === null), damit Benutzer Werte löschen können
    // WICHTIG: Debug-Log für Ziel 8 - Debounce-Status
    logDebounceStatus(zaehlerId, 'startwert', 'debounce_start');
    
    // Bestehenden Timer löschen
    const timerKey = `${zaehlerId}-startwert`;
    if (saveTimeoutRef.current[timerKey]) {
      clearTimeout(saveTimeoutRef.current[timerKey]);
      logTimerStatus(zaehlerId, 'startwert', 'cleared');
    }

    // Neuen Timer erstellen
    saveTimeoutRef.current[timerKey] = setTimeout(async () => {
      try {
        // WICHTIG: Debug-Log für Ziel 5 - Save Lock Status
        logSaveLock('before', zaehlerId, true);
        
        await upsertReading(wegId!, jahrNumber, zaehlerId, { startwert: numValue });
        
        logTimerStatus(zaehlerId, 'startwert', 'flushed');
        logDebounceStatus(zaehlerId, 'startwert', 'debounce_flush');
        
        // Erfolgreich gespeichert - Status auf 'saved' setzen
        updateSaveStatus(zaehlerId, 'startwert', 'saved');
        
        // Status nach 3 Sekunden zurücksetzen
        setTimeout(() => {
          if (mounted.current) {
            updateSaveStatus(zaehlerId, 'startwert', undefined);
          }
        }, 3000);
        
      } catch (error) {
        console.error('Fehler beim Speichern des Startwerts:', error);
        // Fehler für das Startwert-Feld
        updateSaveStatus(zaehlerId, 'startwert', 'error');
        
        // Fehler nach 5 Sekunden zurücksetzen
        setTimeout(() => {
          if (mounted.current) {
            updateSaveStatus(zaehlerId, 'startwert', undefined);
          }
        }, 5000);
      } finally {
        // WICHTIG: Debug-Log für Ziel 5 - Save Lock Status
        logSaveLock('after', zaehlerId, false);
      }
    }, 600);
    
    logTimerStatus(zaehlerId, 'startwert', 'created');
  };

  const handleAblesewertChange = (zaehlerId: string, value: string) => {
    const numValue = parseGermanNumberWithKey(value, 'ablesewert');
    
    // Aktualisiere den lokalen Zustand für optimistische Updates
    setLocalZaehler(prev => prev.map(z => 
      z.id === zaehlerId 
        ? { ...z, ablesewert: numValue }
        : z
    ));
    
    // Validiere die Ablesung nach der Aktualisierung
    const currentZaehler = localZaehler.find(z => z.id === zaehlerId);
    if (currentZaehler) {
      validateAblesung(zaehlerId, currentZaehler.startwert ?? null, numValue);
    }
    
    // Setze Status auf 'saving' NUR für das Ablesewert-Feld
    updateSaveStatus(zaehlerId, 'ablesewert', 'saving');
    
    // WICHTIG: Debug-Log für Ziel 1 - belege, dass nur ablesewert gesendet wird
    const values = { ablesewert: numValue };
    const sentKeys = Object.keys(values).filter(key => values[key as keyof typeof values] !== undefined);
    console.debug('[SAVE->ABLESE]', {
      id: zaehlerId,
      raw: value,
      parsed: numValue,
      sentKeys,
      hasStart: Object.prototype.hasOwnProperty.call(values,'startwert'),
      hasAblese: Object.prototype.hasOwnProperty.call(values,'ablesewert')
    });

    // WICHTIG: Debug-Log für Ziel 3 - Zeitraum/Jahr prüfen
    console.debug('[SAVE] context { jahrActive }', { jahrActive: jahrNumber });

    // WICHTIG: Speichere auch leere Werte (numValue === null), damit Benutzer Werte löschen können
    // WICHTIG: Debug-Log für Ziel 8 - Debounce-Status
    logDebounceStatus(zaehlerId, 'ablesewert', 'debounce_start');
    
    // Bestehenden Timer löschen
    const timerKey = `${zaehlerId}-ablesewert`;
    if (saveTimeoutRef.current[timerKey]) {
      clearTimeout(saveTimeoutRef.current[timerKey]);
      logTimerStatus(zaehlerId, 'ablesewert', 'cleared');
    }

    // Neuen Timer erstellen
    saveTimeoutRef.current[timerKey] = setTimeout(async () => {
      try {
        // WICHTIG: Debug-Log für Ziel 5 - Save Lock Status
        logSaveLock('before', zaehlerId, true);
        
        await upsertReading(wegId!, jahrNumber, zaehlerId, { ablesewert: numValue });
        
        logTimerStatus(zaehlerId, 'ablesewert', 'flushed');
        logDebounceStatus(zaehlerId, 'ablesewert', 'debounce_flush');
        
        // Erfolgreich gespeichert - Status auf 'saved' setzen
        updateSaveStatus(zaehlerId, 'ablesewert', 'saved');
        
        // Status nach 3 Sekunden zurücksetzen
        setTimeout(() => {
          if (mounted.current) {
            updateSaveStatus(zaehlerId, 'ablesewert', undefined);
          }
        }, 3000);
        
      } catch (error) {
        console.error('Fehler beim Speichern des Ablesewerts:', error);
        // Fehler für das Ablesewert-Feld
        updateSaveStatus(zaehlerId, 'ablesewert', 'error');
        
        // Fehler nach 5 Sekunden zurücksetzen
        setTimeout(() => {
          if (mounted.current) {
            updateSaveStatus(zaehlerId, 'ablesewert', undefined);
          }
        }, 5000);
      } finally {
        // WICHTIG: Debug-Log für Ziel 5 - Save Lock Status
        logSaveLock('after', zaehlerId, false);
      }
    }, 600);
    
    logTimerStatus(zaehlerId, 'ablesewert', 'created');
  };

  const handleNotizChange = (zaehlerId: string, value: string) => {
    console.log(`[Ablesungen] handleNotizChange aufgerufen für ${zaehlerId}: ${value}`);
    
    // Aktualisiere den lokalen Zustand für optimistische Updates
    setLocalZaehler(prev => prev.map(z => 
      z.id === zaehlerId 
        ? { ...z, notiz: value || '' }
        : z
    ));
    
    // Validiere die Ablesung nach der Aktualisierung (falls Startwert und Ablesewert vorhanden sind)
    const currentZaehler = localZaehler.find(z => z.id === zaehlerId);
    if (currentZaehler && currentZaehler.startwert !== null && currentZaehler.ablesewert !== null) {
      validateAblesung(zaehlerId, currentZaehler.startwert ?? null, currentZaehler.ablesewert ?? null);
    }
    
    // Setze Status auf 'saving' NUR für das Notiz-Feld
    updateSaveStatus(zaehlerId, 'notiz', 'saving');
    
    // WICHTIG: Verwende upsertReading anstatt updateNote, um die Notiz in den jahresspezifischen Daten zu speichern
    // Das stellt sicher, dass die Notizen beim erneuten Laden der Ablesungen korrekt angezeigt werden
    upsertReading(wegId!, jahrNumber, zaehlerId, { notiz: value || '' })
      .then((updatedZaehler) => {
        // Erfolgreich gespeichert - Context wird automatisch aktualisiert
        // WICHTIG: Nur den Status für das notiz-Feld setzen, nicht für andere Felder
        updateSaveStatus(zaehlerId, 'notiz', 'saved');
        console.log('[Ablesungen] Notiz erfolgreich in jahresspezifischen Daten gespeichert:', {
          zaehlerId,
          notiz: value,
          jahr: jahrNumber,
          returnedZaehler: updatedZaehler,
          returnedNotiz: updatedZaehler.notiz
        });
        
        // WICHTIG: Lade die aktualisierten Zählerstände neu, um den Context-State zu aktualisieren
        // Das stellt sicher, dass die Notizen beim erneuten Laden korrekt angezeigt werden
        try {
          reloadZaehlerstaende();
          console.log('[Ablesungen] Zählerstände nach Notiz-Update neu geladen');
        } catch (reloadError) {
          console.warn('[Ablesungen] Fehler beim Neuladen der Zählerstände:', reloadError);
        }
        
        // Status nach 3 Sekunden zurücksetzen
        setTimeout(() => {
          if (mounted.current) {
            updateSaveStatus(zaehlerId, 'notiz', undefined); // Status zurücksetzen
          }
        }, 3000);
      })
      .catch((error) => {
        // Fehler NUR für das Notiz-Feld
        updateSaveStatus(zaehlerId, 'notiz', 'error');
        console.error('[Ablesungen] Fehler beim Speichern der Notiz in jahresspezifischen Daten:', error);
        
        // Fehler nach 5 Sekunden zurücksetzen
        setTimeout(() => {
          if (mounted.current) {
            updateSaveStatus(zaehlerId, 'notiz', undefined); // Status zurücksetzen
          }
        }, 5000);
      });
  };

  const handleInputBlur = (zaehlerId: string) => {
    // onBlur wird nicht mehr benötigt, da Speichern direkt bei onChange erfolgt
    console.log('[Ablesungen] onBlur für Zähler:', zaehlerId);
  };

  const validateAblesung = (zaehlerId: string, startwert: number | null, ablesewert: number | null) => {
    if (startwert !== null && ablesewert !== null && startwert > ablesewert) {
      // Verwende zuerst die lokalen Daten, dann die aus dem Context
      const currentZaehler = localZaehler.find(z => z.id === zaehlerId) || zaehler?.find(z => z.id === zaehlerId);
      const zaehlernummer = currentZaehler?.zaehlernummer || 'Unbekannt';
      
      const errorMessage = `Eingabefehler: ${zaehlernummer}: Startwert muss kleiner oder gleich Ablesewert sein.`;
      setInputErrors(prev => ({ ...prev, [zaehlerId]: errorMessage }));
      
      // Fehler nach 5 Sekunden löschen
      setTimeout(() => {
        if (mounted.current) {
          setInputErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[zaehlerId];
            return newErrors;
          });
        }
      }, 5000);
    } else {
      // Fehler löschen falls valid
      setInputErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[zaehlerId];
        return newErrors;
      });
    }
  };

  // Render-Guards
  if (!zaehler || !wegEinheiten) { // Use zaehler and wegEinheiten from context
    return (
      <div className="p-6">
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
            Lade Ablesungen...
          </h3>
        </div>
      </div>
    );
  }

  if (zaehler.length === 0) { // Use zaehler from context
    return (
      <div className="p-6">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#fefce8',
            border: '1px solid #fde047',
            borderRadius: '8px',
            color: '#a16207'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Keine Zähler vorhanden
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Legen Sie zuerst Zähler in der Zählerübersicht an.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <PageTitle 
            title="Ablesungen" 
            extra={<DebugPageId id={PAGE_IDS.ABLESUNGEN} />}
          />
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '16px',
            color: '#6b7280'
          }}>
            Ablesungen für {jahrNumber}
          </p>
        </div>

        {/* Debug Info */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
            Debug Info
          </h3>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify({
              wegId,
              jahr: jahrNumber,
              zaehlerCount: zaehler?.length, // Use zaehler from context
              wegEinheitenCount: wegEinheiten?.length,
              renderGroupsCount: groups.length,
              groupedZaehler: groups.map(g => g.einheit?.id),
              sortedEinheiten: sortedEinheiten.map(e => ({ id: e.id, titel: e.titel, wohnungsnummer: e.wohnungsnummer })),
              // ablesungenCount: Object.keys(ablesungen).length // Removed local state
            }, null, 2)}
          </pre>
        </div>

        {/* Zähler nach Einheit gruppiert */}
        {groups.map(({ einheit, items }) => (
          <div key={einheit?.id} style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            marginBottom: '24px',
            overflow: 'hidden'
          }}>
            {/* Einheit Header */}
            <div style={{
              padding: '20px 24px',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                margin: '0 0 4px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
              }}>
                Einheit: {einheit?.titel || einheit?.name || 'Unbekannt'}
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7280'
              }}>
                Mieter: {einheit?.mieter || einheit?.mieterName || 'Eigentümer'}
              </p>
            </div>

            {/* Tabelle mit Eingabefeldern */}
            <div style={{ overflow: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Zählernummer
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Bezeichnung
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Zählertyp
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Standort
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Startwert
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Ablesewert
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Notiz
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(zaehler => {
                    const ablesung = zaehler; // Use zaehler from context
                    const inputError = inputErrors[zaehler.id];
                    const startwertSaveState = getSaveStatus(zaehler.id, 'startwert');
                    const ablesewertSaveState = getSaveStatus(zaehler.id, 'ablesewert');
                    const notizSaveState = getSaveStatus(zaehler.id, 'notiz');
                    // const inputValue = inputValuesRef.current[zaehler.id] || {}; // Removed local state
                    
                    return (
                      <tr key={zaehler.id} style={{
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: inputError ? '#fef2f2' : 'transparent'
                      }}>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: '#111827',
                          fontFamily: 'monospace'
                        }}>
                          {zaehler.zaehlernummer}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '500'
                        }}>
                          {zaehler.bezeichnung}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: '#111827'
                        }}>
                          {zaehler.zaehlertyp}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: '#111827'
                        }}>
                          {zaehler.standort || '-'}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '14px'
                        }}>
                          <div style={{ position: 'relative' }}>
                                                                                      <input
                              type="text"
                              inputMode="decimal"
                              value={(localZaehler.find(z => z.id === zaehler.id)?.startwert ?? zaehler.startwert ?? '')}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: getSaveStatus(zaehler.id, 'startwert') === 'error' ? '1px solid #dc2626' : '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                backgroundColor: getSaveStatus(zaehler.id, 'startwert') === 'error' ? '#fef2f2' : 'white'
                              }}
                              data-testid={`startwert-input-${zaehler.id}`}
                              // WICHTIG: Ziel 10 - Notfall-Workaround: Alle Sperren entfernt
                              disabled={false}
                              readOnly={false}
                              // WICHTIG: Debug-Log für Ziel 6 - Input Type Test
                              ref={(el) => {
                                if (el) {
                                  logInputTypeTest('start', 'text', true);
                                  logHydration(zaehler.id, 'start', el.value, zaehler.startwert);
                                  // WICHTIG: Debug-Log für Ziel 2 - Alle Sperren identifizieren
                                  logFieldLocks(zaehler.id, 'start', el);
                                }
                              }}
                              // WICHTIG: Debug-Log für Ziel 1 - Feld-Props und Events verifizieren
                              onFocus={(e) => {
                                const target = e.target as HTMLInputElement;
                                logFieldEvent('start', 'focus', zaehler.id, target.value);
                                console.debug('[HYDRATE] Stroh startwert input focus:', {
                                  start: zaehler.startwert,
                                  ablese: zaehler.ablesewert,
                                  contextValue: zaehler.startwert ?? '',
                                  timestamp: new Date().toISOString()
                                });
                              }}
                              onKeyDown={(e) => {
                                const target = e.target as HTMLInputElement;
                                logFieldEvent('start', 'keydown', zaehler.id, target.value);
                                logKeyBlockers('start', e, `startwert-input-${zaehler.id}`);
                              }}
                              onCompositionStart={(e) => {
                                const target = e.target as HTMLInputElement;
                                logComposition('start', 'start', target.value);
                              }}
                              onCompositionEnd={(e) => {
                                const target = e.target as HTMLInputElement;
                                logComposition('start', 'end', target.value);
                              }}
                              onChange={(e) => {
                                const target = e.target as HTMLInputElement;
                                logFieldEvent('start', 'change', zaehler.id, target.value);
                                handleStartwertChange(zaehler.id, target.value);
                              }}
                              onBlur={(e) => {
                                const target = e.target as HTMLInputElement;
                                logFieldEvent('start', 'blur', zaehler.id, target.value);
                                handleInputBlur(zaehler.id);
                              }}
                            />
                            {/* Plausibilitätsfehler-Anzeige */}
                            {hasPlausibilityError(zaehler.id) && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                fontSize: '11px',
                                color: '#dc2626',
                                backgroundColor: '#fef2f2',
                                padding: '2px 4px',
                                borderRadius: '2px',
                                border: '1px solid #fecaca',
                                zIndex: 10
                              }}>
                                ⚠️ Startwert muss ≤ Ablesewert sein
                              </div>
                            )}
                            {startwertSaveState && (
                              <div style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '12px',
                                color: startwertSaveState === 'saving' ? '#f59e0b' : 
                                       startwertSaveState === 'saved' ? '#10b981' : '#ef4444'
                              }}>
                                {startwertSaveState === 'saving' ? '💾' : 
                                 startwertSaveState === 'saved' ? '✅' : '❌'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '14px'
                        }}>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={(localZaehler.find(z => z.id === zaehler.id)?.ablesewert ?? zaehler.ablesewert ?? '')}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: inputErrors[zaehler.id] ? '1px solid #dc2626' : '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                backgroundColor: inputErrors[zaehler.id] ? '#fef2f2' : 'white'
                              }}
                              data-zaehler-id={zaehler.id}
                              data-field="ablesewert"
                              data-testid={`ablesewert-input-${zaehler.id}`}
                              // WICHTIG: Ziel 10 - Notfall-Workaround: Alle Sperren entfernt
                              disabled={false}
                              readOnly={false}
                              // WICHTIG: Debug-Log für Ziel 1 - Feld-Props und Events verifizieren
                              onFocus={(e) => {
                                const target = e.target as HTMLInputElement;
                                logFieldEvent('ablese', 'focus', zaehler.id, target.value);
                                console.debug('[HYDRATE] Stroh ablesewert input focus:', {
                                  start: zaehler.startwert,
                                  ablese: zaehler.ablesewert,
                                  contextValue: zaehler.ablesewert ?? '',
                                  timestamp: new Date().toISOString()
                                });
                              }}
                              onKeyDown={(e) => {
                                const target = e.target as HTMLInputElement;
                                logFieldEvent('ablese', 'keydown', zaehler.id, target.value);
                                logKeyBlockers('ablese', e, `ablesewert-input-${zaehler.id}`);
                              }}
                              onChange={(e) => {
                                const target = e.target as HTMLInputElement;
                                logFieldEvent('ablese', 'change', zaehler.id, target.value);
                                handleAblesewertChange(zaehler.id, target.value);
                              }}
                              onBlur={(e) => {
                                const target = e.target as HTMLInputElement;
                                logFieldEvent('ablese', 'blur', zaehler.id, target.value);
                                handleInputBlur(zaehler.id);
                              }}
                            />
                            {/* Plausibilitätsfehler-Anzeige */}
                            {hasPlausibilityError(zaehler.id) && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                fontSize: '11px',
                                color: '#dc2626',
                                backgroundColor: '#fef2f2',
                                padding: '2px 4px',
                                borderRadius: '2px',
                                border: '1px solid #fecaca',
                                zIndex: 10
                              }}>
                                ⚠️ Startwert muss ≤ Ablesewert sein
                              </div>
                            )}
                            {ablesewertSaveState && (
                              <div style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '12px',
                                color: ablesewertSaveState === 'saving' ? '#f59e0b' : 
                                       ablesewertSaveState === 'saved' ? '#10b981' : '#ef4444'
                              }}>
                                {ablesewertSaveState === 'saving' ? '💾' : 
                                 ablesewertSaveState === 'saved' ? '✅' : '❌'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '14px'
                        }}>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Notiz eingeben..."
                              value={(localZaehler.find(z => z.id === zaehler.id)?.notiz ?? zaehler.notiz) || ''}
                              onChange={(e) => handleNotizChange(zaehler.id, e.target.value)}
                              onBlur={() => handleInputBlur(zaehler.id)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontFamily: 'inherit'
                              }}
                              data-zaehler-id={zaehler.id}
                              data-field="notiz"
                              data-testid={`notiz-input-${zaehler.id}`}
                            />
                            {notizSaveState && (
                              <div style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '12px',
                                color: notizSaveState === 'saving' ? '#f59e0b' : 
                                       notizSaveState === 'saved' ? '#10b981' : '#ef4444'
                              }}>
                                {notizSaveState === 'saving' ? '💾' : 
                                 notizSaveState === 'saved' ? '✅' : '❌'}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Eingabefehler anzeigen */}
            {Object.keys(inputErrors).length > 0 && (
              <div style={{
                padding: '16px 24px',
                backgroundColor: '#fef2f2',
                borderTop: '1px solid #fecaca'
              }}>
                <h4 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#dc2626'
                }}>
                  Eingabefehler:
                </h4>
                {Object.entries(inputErrors).map(([zaehlerId, error]) => {
                  const currentZaehler = zaehler?.find(z => z.id === zaehlerId);
                  return (
                    <p key={zaehlerId} style={{
                      margin: '4px 0',
                      padding: '8px 12px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '4px',
                      color: '#dc2626',
                      fontSize: '14px'
                    }}>
                      {error}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Keine Zähler vorhanden */}
        {groups.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
              {zaehler && zaehler.length > 0 ? 'Zähler werden geladen...' : 'Keine Zähler vorhanden'}
            </h3>
            <p style={{ margin: 0, color: '#6b7280' }}>
              {zaehler && zaehler.length > 0 
                ? 'Bitte warten Sie, während die Zähler geladen werden...'
                : 'Für diese WEG sind noch keine Zähler konfiguriert. Bitte erstellen Sie zuerst Zähler in der Zählerübersicht.'
              }
            </p>
            {zaehler && zaehler.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <button 
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Seite neu laden
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AblesungenPage;
