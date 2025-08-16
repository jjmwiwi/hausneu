import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ensurePeriod } from '../storage/zaehlerstaendeStorage';
import { loadAbleseStatus, getStatus, setComplete, resetComplete, isYearComplete, checkAndUpdateYearCompleteness, AbleseStatus } from '../storage/zaehlerstaendeStatusStorage';
import { createAbleseprotokollPDF, createProtokollRows } from '../utils/ableseProtokollPdf';
import { useImmobilien } from '../contexts/ImmobilienContext';
import { NAV } from '../../src/config/nav.config';
// PAGE_IDS nicht mehr benötigt, da DebugPageId entfernt wurde
// DebugPageId entfernt - Debug-Fenster wird nicht mehr angezeigt
import PageTitle from './ui/PageTitle';

const ZaehlerstaendeOverview: React.FC = () => {
  console.info('[Ablesungen] mounted');
  
  // Route-Überprüfung
  console.log('[DEBUG] Aktuelle Route:', window.location.hash);
  console.log('[DEBUG] Komponente: ZaehlerstaendeOverview.tsx geladen');
  
  const navigate = useNavigate();
  const { wegId } = useParams();
  const { wegEinheiten, stammdaten, zaehler, loadZaehler } = useImmobilien();
  const currentYear = new Date().getFullYear();
  
  // Status laden
  const [statusList, setStatusList] = useState<AbleseStatus[]>([]);
  
  useEffect(() => {
    try { 
      setStatusList(loadAbleseStatus()); 
    } catch (e) { 
      console.warn('status load failed', e); 
      setStatusList([]); 
    }
  }, []);
  
  // WICHTIG: Lade Zähler für die aktuelle WEG
  useEffect(() => {
    if (wegId && wegEinheiten && wegEinheiten.length > 0) {
      console.log(`[ZaehlerstaendeOverview] Lade Zähler für WEG ${wegId}`);
      loadZaehler(wegId);
    }
  }, [wegId, wegEinheiten, loadZaehler]);
  
  const statusByYear = useMemo(() => 
    Object.fromEntries(statusList.map(s => [s.jahr, s])), 
    [statusList]
  );

  // Stelle sicher, dass der aktuelle Zeitraum existiert
  useEffect(() => {
    ensurePeriod(currentYear);
  }, [currentYear]);

  // Hilfsfunktion zum Laden der Zählerstände für ein bestimmtes Jahr
  const loadZaehlerstaendeForYear = async (jahr: number): Promise<any[]> => {
    try {
      // WICHTIG: Lade die jahresspezifischen Daten aus dem Zaehlerstand
      const { loadZaehlerstaende, getZaehlerstand } = await import('../storage/zaehlerstaendeStorage');
      
      // Lade alle Zählerstände für das Jahr
      const zaehlerstaende = loadZaehlerstaende().filter(zs => zs.jahr === jahr);
      
      // Kombiniere Zähler-Daten mit jahresspezifischen Ablesewerten
      const zaehlerMitAblesewerten = zaehler.map(zaehler => {
        const zaehlerstand = zaehlerstaende.find(zs => zs.zaehlernummer === zaehler.zaehlernummer);
        
        return {
          jahr,
          einheitId: zaehler.einheitId,
          zaehlernummer: zaehler.zaehlernummer,
          bezeichnung: zaehler.bezeichnung,
          zaehlertyp: zaehler.zaehlertyp,
          standort: zaehler.standort,
          startwert: zaehlerstand?.startwert ?? zaehler.startwert,
          ablesewert: zaehlerstand?.ablesewert ?? zaehler.ablesewert,
          notiz: zaehlerstand?.notiz ?? zaehler.notiz
        };
      });
      
      console.log(`[ZaehlerstaendeOverview] ${zaehlerMitAblesewerten.length} Zähler mit Ablesewerten für Jahr ${jahr} geladen`);
      return zaehlerMitAblesewerten;
      
    } catch (error) {
      console.error(`[ZaehlerstaendeOverview] Fehler beim Laden der Zählerstände für Jahr ${jahr}:`, error);
      
      // Fallback: Verwende die Zähler-Daten direkt
      return zaehler.map(zaehler => ({
        jahr,
        einheitId: zaehler.einheitId,
        zaehlernummer: zaehler.zaehlernummer,
        bezeichnung: zaehler.bezeichnung,
        zaehlertyp: zaehler.zaehlertyp,
        standort: zaehler.standort,
        startwert: zaehler.startwert,
        ablesewert: zaehler.ablesewert,
        notiz: zaehler.notiz
      }));
    }
  };

  // Hilfsfunktion zum Rendern eines Jahres
  const renderYearCard = (jahr: number) => {
    const s = statusByYear[jahr];
    
    // WICHTIG: Prüfe automatisch die Vollständigkeit basierend auf den aktuellen Zähler-Daten
    const isComplete = useMemo(() => {
      if (zaehler && zaehler.length > 0) {
        // Lade die jahresspezifischen Daten für die Vollständigkeitsprüfung
        const loadJahresDaten = async () => {
          try {
            const { loadZaehlerstaende } = await import('../storage/zaehlerstaendeStorage');
            const zaehlerstaende = loadZaehlerstaende().filter(zs => zs.jahr === jahr);
            
            // Kombiniere Zähler mit jahresspezifischen Daten
            const zaehlerMitJahresdaten = zaehler.map(z => {
              const zaehlerstand = zaehlerstaende.find(zs => zs.zaehlernummer === z.zaehlernummer);
              return {
                ...z,
                startwert: zaehlerstand?.startwert ?? z.startwert,
                ablesewert: zaehlerstand?.ablesewert ?? z.ablesewert
              };
            });
            
            // Prüfe Vollständigkeit mit den jahresspezifischen Daten
            const jahrZaehler = zaehlerMitJahresdaten.filter(z => {
              const hasStartwert = z.startwert !== null && z.startwert !== undefined;
              const hasAblesewert = z.ablesewert !== null && z.ablesewert !== undefined;
              return hasStartwert && hasAblesewert;
            });
            
            const isActuallyComplete = jahrZaehler.length === zaehler.length;
            
            // Aktualisiere den Status automatisch
            if (isActuallyComplete !== !!s?.isComplete) {
              checkAndUpdateYearCompleteness(jahr, zaehlerMitJahresdaten);
            }
            
            return isActuallyComplete;
          } catch (error) {
            console.warn(`[ZaehlerstaendeOverview] Fehler bei Vollständigkeitsprüfung für Jahr ${jahr}:`, error);
            return !!s?.isComplete;
          }
        };
        
        // Führe die Prüfung aus
        loadJahresDaten();
        
        // Verwende den gespeicherten Status als Fallback
        return !!s?.isComplete;
      }
      return !!s?.isComplete;
    }, [jahr, zaehler, s?.isComplete]);
    
    console.debug('[Ablesungen] render Jahr', jahr, { 
      status: statusByYear[jahr], 
      isComplete, 
      zaehlerCount: zaehler?.length || 0 
    });
    
    return (
      <div className="card" style={{
        padding: '20px',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        backgroundColor: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
              }}>
                Zeitraum {jahr}
              </h3>
              
              {/* Status Badge */}
              <div 
                data-testid="status-badge"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: isComplete ? '#dcfce7' : '#fef2f2',
                  color: isComplete ? '#166534' : '#dc2626',
                  border: `1px solid ${isComplete ? '#bbf7d0' : '#fecaca'}`
                }}
              >
                {isComplete ? '✓ Vollständig erfasst' : '✗ Nicht vollständig'}
              </div>
              
              {/* Status zurücksetzen Button */}
              {isComplete && (
                <button
                  onClick={() => { 
                    resetComplete(jahr); 
                    setStatusList(loadAbleseStatus()); 
                  }}
                  className="btn"
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    border: '1px solid #d1d5db'
                  }}
                  title="Status zurücksetzen"
                >
                  ↺
                </button>
              )}
            </div>
            
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6b7280'
            }}>
              01.01.{jahr} – 31.12.{jahr}
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => navigate(`/immobilien/${wegId}${NAV.ZAEHLER.ABLESUNGEN.path}/${jahr}`)}
              className="btn btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '14px'
              }}
            >
              Ablesung
            </button>
            
            <button
              onClick={handlePdf(jahr)}
              className="btn"
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#f59e0b',
                color: 'white'
              }}
            >
              Ableseprotokoll (PDF)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // PDF-Handler
  const handlePdf = (jahr: number) => async () => {
    try {
      console.log(`[PDF] Starte PDF-Erstellung für Jahr ${jahr}`);
      
      const zaehlerstaende = await loadZaehlerstaendeForYear(jahr);
      console.log(`[PDF] ${zaehlerstaende.length} Zählerstände für PDF geladen:`, zaehlerstaende.map(zs => `${zs.zaehlernummer} (${zs.einheitId})`));
      
      if (zaehlerstaende.length === 0) {
        alert(`Keine Zählerstände für Jahr ${jahr} gefunden`);
        return;
      }
      
      // Erstelle Protokoll-Zeilen (Allgemein → Einheiten)
      const rows = createProtokollRows(zaehlerstaende, wegEinheiten, jahr);
      console.log(`[PDF] ${rows.length} Protokoll-Zeilen erstellt:`, rows.map(r => `${r.zaehlernummer} - ${r.einheitName}`));
      
      // DEBUG: Zeige alle Zeilen detailliert
      console.log(`[PDF] Alle Zeilen Details:`, rows.map(r => ({
        zaehlernummer: r.zaehlernummer,
        einheitId: r.einheitId,
        einheitName: r.einheitName,
        startwert: r.startwert,
        ablesewert: r.ablesewert
      })));
      
      // DEBUG: Gruppiere nach Einheiten für bessere Übersicht
      const einheitenMap = new Map<string, any[]>();
      for (const row of rows) {
        if (!einheitenMap.has(row.einheitId)) {
          einheitenMap.set(row.einheitId, []);
        }
        einheitenMap.get(row.einheitId)!.push(row);
      }
      console.log(`[PDF] Gruppierung nach Einheiten:`, Array.from(einheitenMap.entries()).map(([id, rows]) => 
        `${id}: ${rows.length} Zähler (${rows.map(r => r.zaehlernummer).join(', ')})`
      ));
      
      // Erstelle PDF
      const pdfBytes = await createAbleseprotokollPDF({
        wegName: stammdaten.name,
        wegAddress: stammdaten.address,
        wegCity: stammdaten.city,
        wegZip: stammdaten.zip,
        jahr,
        rows
      });
      
      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ableseprotokoll_${jahr}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      console.log(`[PDF] PDF für Jahr ${jahr} erfolgreich erstellt`);
    } catch (error) {
      console.error(`[PDF] Fehler bei PDF-Erstellung für Jahr ${jahr}:`, error);
      alert(`Fehler bei PDF-Erstellung: ${error}`);
    }
  };

  return (
    <div className="p-6">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header mit Titel */}
        <div style={{
          marginBottom: '32px'
        }}>
          <PageTitle title="Ablesung" />
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '16px',
            color: '#6b7280'
          }}>
            Wählen Sie einen Zeitraum für die Zählerstandserfassung
          </p>
        </div>

        {/* Zeiträume Liste */}
        <div style={{
          display: 'grid',
          gap: '16px'
        }}>
          {/* Aktuelles Jahr */}
          {renderYearCard(currentYear)}

          {/* Vorjahr */}
          {renderYearCard(currentYear - 1)}

          {/* Vorvorjahr */}
          {renderYearCard(currentYear - 2)}

          {/* Vorvorvorjahr */}
          {renderYearCard(currentYear - 3)}
        </div>

        {/* Info-Box */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>ℹ️</span>
            <div>
              <h4 style={{
                margin: '0 0 4px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Zählerstandserfassung
              </h4>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#6b7280'
              }}>
                Erfassen Sie die Start- und Ablesewerte aller Zähler für den gewählten Zeitraum. 
                Die Werte werden automatisch gespeichert und können später für Abrechnungen verwendet werden.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZaehlerstaendeOverview;
