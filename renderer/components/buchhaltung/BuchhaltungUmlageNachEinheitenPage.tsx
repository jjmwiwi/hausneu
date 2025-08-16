import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PageTitle } from '../ui/PageTitle';
import DebugPageId from '../ui/DebugPageId';
import { PAGE_IDS } from '../../../src/constants/pageIds';
import { useImmobilien } from '../../contexts/ImmobilienContext';
import UmlageService, { UmlageViewByEinheit } from '../../services/umlageService';
import { fmtDate, fmtEUR } from '../../utils/buchhaltungUtils';

const BuchhaltungUmlageNachEinheitenPage: React.FC = () => {
  const { wegId } = useParams<{ wegId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { belege, wegEinheiten, kostenarten } = useImmobilien();
  
  // State für die Umlage-Daten
  const [umlageData, setUmlageData] = useState<UmlageViewByEinheit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter-State
  const [jahr, setJahr] = useState<number>(new Date().getFullYear());
  const [selectedKostenarten, setSelectedKostenarten] = useState<string[]>([]);
  const [nurMitSnapshot, setNurMitSnapshot] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nurMitBetrag, setNurMitBetrag] = useState(false);
  
  // URL-Parameter beim Laden extrahieren
  useEffect(() => {
    const jahrParam = searchParams.get('jahr');
    if (jahrParam) {
      const jahrValue = parseInt(jahrParam, 10);
      if (!isNaN(jahrValue)) {
        setJahr(jahrValue);
      }
    }
  }, [searchParams]);
  
  // URL-Parameter aktualisieren wenn sich Jahr ändert
  useEffect(() => {
    if (jahr) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('jahr', jahr.toString());
        return newParams;
      });
    }
  }, [jahr, setSearchParams]);
  
  // Umlage-Daten laden
  const loadUmlageData = useMemo(() => async () => {
    if (!wegId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Filtere Belege nach WEG und Jahr
      const wegBelege = belege.filter(b => b.wegId === wegId && b.jahr === jahr);
      const wegEinheitenFiltered = wegEinheiten.filter(e => e.wegId === wegId);
      
      // Mock-Implementierung für jetzt
      const mockData: UmlageViewByEinheit = {
        einheiten: wegEinheitenFiltered.map(e => ({
          einheitId: e.id,
          wohnungsnummer: e.wohnungsnummer.toString(),
          wohnflaeche: e.wohnflaeche,
          mea: e.miteigentumsAnteil
        })),
        rowsByEinheit: {},
        sumByEinheit: {},
        grandTotal: 0,
        belegCount: wegBelege.length,
        fehlendeSnapshots: wegBelege.filter(b => !b.umlageSnapshot).length
      };
      
      // Belege mit Umlage-Snapshots verarbeiten
      wegBelege.forEach(beleg => {
        if (beleg.umlageSnapshot) {
          beleg.umlageSnapshot.anteile.forEach(anteil => {
            const einheitId = anteil.einheitId;
            
            if (!mockData.rowsByEinheit[einheitId]) {
              mockData.rowsByEinheit[einheitId] = [];
              mockData.sumByEinheit[einheitId] = 0;
            }
            
            const kostenart = kostenarten.find(k => k.id === beleg.kostenartId);
            const umlageStatus: 'AUTO' | 'MANUELL' | 'FEHLER' = 
              beleg.umlageSnapshot?.hinweise?.some(h => h.includes('Fehler')) ? 'FEHLER' :
              beleg.umlageQuelle === 'auto' ? 'AUTO' : 'MANUELL';
            
            mockData.rowsByEinheit[einheitId].push({
              belegId: beleg.id,
              datum: beleg.datum,
              belegname: beleg.belegname,
              kostenartId: beleg.kostenartId,
              kostenartName: kostenart?.name || 'Unbekannte Kostenart',
              verteilschluesselId: beleg.verteilschluesselId,
              anteilProzent: anteil.prozent,
              anteilBetrag: anteil.betrag,
              belegBetrag: beleg.betragBrutto,
              umlageStatus,
              hinweise: beleg.umlageSnapshot?.hinweise
            });
            
            mockData.sumByEinheit[einheitId] += anteil.betrag;
            mockData.grandTotal += anteil.betrag;
          });
        }
      });
      
      setUmlageData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  }, [wegId, jahr, belege, wegEinheiten, kostenarten]);
  
  // Daten beim Laden der Komponente und bei Änderungen laden
  useEffect(() => {
    loadUmlageData();
  }, [loadUmlageData]);
  
  // Gefilterte Einheiten (ohne leere wenn Filter aktiv)
  const filteredEinheiten = useMemo(() => {
    if (!umlageData) return [];
    
    let filtered = umlageData.einheiten;
    
    if (nurMitBetrag) {
      filtered = filtered.filter(e => (umlageData.sumByEinheit[e.einheitId] || 0) !== 0);
    }
    
    return filtered.sort((a, b) => parseInt(a.wohnungsnummer) - parseInt(b.wohnungsnummer));
  }, [umlageData, nurMitBetrag]);
  
  // Alle fehlenden Umlagen berechnen
  const calculateAllMissing = async () => {
    if (!wegId || !umlageData) return;
    
    setIsLoading(true);
    try {
      // TODO: Implementierung der Batch-Umlage-Berechnung
      console.log('Berechne alle fehlenden Umlagen...');
      
      // Nach der Berechnung Daten neu laden
      await loadUmlageData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Umlage-Berechnung');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Einzelne Umlage neu berechnen
  const recalculateSingle = async (belegId: string) => {
    if (!wegId) return;
    
    try {
      // TODO: Implementierung der Einzel-Umlage-Berechnung
      console.log(`Berechne Umlage für Beleg ${belegId} neu...`);
      
      // Nach der Berechnung Daten neu laden
      await loadUmlageData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Umlage-Berechnung');
    }
  };
  
  // CSV-Export
  const exportToCSV = () => {
    if (!umlageData) return;
    
    const csvContent = [
      'Einheit;Wohnungsnummer;Datum;Belegname;Kostenart;Verteilschluessel;Anteil%;BetragEUR;BelegbetragEUR;UmlageStatus',
      ...filteredEinheiten.flatMap(einheit => 
        (umlageData.rowsByEinheit[einheit.einheitId] || []).map(row => 
          [
            einheit.einheitId,
            einheit.wohnungsnummer,
            fmtDate(row.datum),
            `"${row.belegname}"`,
            `"${row.kostenartName}"`,
            row.verteilschluesselId,
            row.anteilProzent.toFixed(2).replace('.', ','),
            row.anteilBetrag.toFixed(2).replace('.', ','),
            row.belegBetrag.toFixed(2).replace('.', ','),
            row.umlageStatus
          ].join(';')
        )
      )
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Umlage_nach_Einheiten_${wegId}_${jahr}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Status-Badge für Umlage-Status
  const StatusBadge: React.FC<{ status: 'AUTO' | 'MANUELL' | 'FEHLER' }> = ({ status }) => {
    const colors = {
      AUTO: '#10b981',
      MANUELL: '#3b82f6',
      FEHLER: '#ef4444'
    };
    
    return (
      <span style={{
        backgroundColor: colors[status],
        color: 'white',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {status}
      </span>
    );
  };
  
  if (isLoading) {
    return (
      <div>
        <PageTitle 
          title="Buchhaltung – Umlage nach Einheiten"
          extra={<DebugPageId id={PAGE_IDS.BUCHHALTUNG_UMLAGE} />}
        />
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Lade Umlage-Daten...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <PageTitle 
          title="Buchhaltung – Umlage nach Einheiten"
          extra={<DebugPageId id={PAGE_IDS.BUCHHALTUNG_UMLAGE} />}
        />
        <div style={{ 
          padding: '24px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '12px', 
          color: '#dc2626',
          marginTop: '20px'
        }}>
          <h3>Fehler beim Laden der Daten</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <PageTitle 
        title="Buchhaltung – Umlage nach Einheiten"
        extra={<DebugPageId id={PAGE_IDS.BUCHHALTUNG_UMLAGE} />}
      />
      
      {/* Filterleiste */}
      <div style={{
        padding: '20px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        marginTop: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Jahr */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Abrechnungsjahr *
            </label>
            <select
              value={jahr}
              onChange={(e) => setJahr(parseInt(e.target.value, 10))}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {/* Kostenarten */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Kostenarten
            </label>
            <select
              multiple
              value={selectedKostenarten}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedKostenarten(values);
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            >
              {kostenarten.map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>
          
          {/* Nur mit Snapshot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="nurMitSnapshot"
              checked={nurMitSnapshot}
              onChange={(e) => setNurMitSnapshot(e.target.checked)}
            />
            <label htmlFor="nurMitSnapshot" style={{ fontSize: '14px' }}>
              Nur mit Snapshot
            </label>
          </div>
          
          {/* Nur mit Betrag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="nurMitBetrag"
              checked={nurMitBetrag}
              onChange={(e) => setNurMitBetrag(e.target.checked)}
            />
            <label htmlFor="nurMitBetrag" style={{ fontSize: '14px' }}>
              Nur Einheiten mit Betrag ≠ 0
            </label>
          </div>
          
          {/* Suche */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Suche
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Belegname..."
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                width: '200px'
              }}
            />
          </div>
          
          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            <button
              onClick={loadUmlageData}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Anwenden
            </button>
            <button
              onClick={() => {
                setSelectedKostenarten([]);
                setSearchTerm('');
                setNurMitSnapshot(true);
                setNurMitBetrag(false);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      </div>
      
      {/* Hinweis-Banner für fehlende Snapshots */}
      {umlageData && umlageData.fehlendeSnapshots > 0 && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>Hinweis:</strong> Bei {umlageData.fehlendeSnapshots} Beleg(en) ist noch keine Umlage berechnet.
          </div>
          <button
            onClick={calculateAllMissing}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Alle fehlenden berechnen
          </button>
        </div>
      )}
      
      {/* Einheiten-Accordions */}
      {filteredEinheiten.length > 0 ? (
        <div style={{ marginBottom: '20px' }}>
          {filteredEinheiten.map(einheit => {
            const rows = umlageData?.rowsByEinheit[einheit.einheitId] || [];
            const summe = umlageData?.sumByEinheit[einheit.einheitId] || 0;
            
            return (
              <div
                key={einheit.einheitId}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  overflow: 'hidden'
                }}
              >
                {/* Accordion Header */}
                <div style={{
                  padding: '16px 20px',
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                        Wohnung {einheit.wohnungsnummer} · {einheit.einheitId}
                      </h3>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <span style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0277bd',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          Wohnfläche: {einheit.wohnflaeche} m²
                        </span>
                        <span style={{
                          backgroundColor: '#f3e5f5',
                          color: '#7b1fa2',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          MEA: {einheit.mea} ‰
                        </span>
                        <span style={{
                          backgroundColor: '#e8f5e8',
                          color: '#2e7d32',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          Summe: {fmtEUR(summe)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Accordion Content */}
                {rows.length > 0 ? (
                  <div style={{ padding: '0' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Datum</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Belegname</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Kostenart</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Anteil %</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Betrag (EUR)</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Belegbetrag</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => (
                          <tr key={`${row.belegId}-${index}`} style={{
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                          }}>
                            <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                              {fmtDate(row.datum)}
                            </td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                              {row.belegname}
                            </td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                              <span title={`Verteilschlüssel: ${row.verteilschluesselId}`}>
                                {row.kostenartName}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                              {row.anteilProzent.toFixed(2)}%
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{
                                color: row.anteilBetrag >= 0 ? '#059669' : '#dc2626',
                                fontWeight: '500'
                              }}>
                                {fmtEUR(row.anteilBetrag)}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                              {fmtEUR(row.belegBetrag)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                              <StatusBadge status={row.umlageStatus} />
                              {row.hinweise && row.hinweise.length > 0 && (
                                <div style={{ marginTop: '4px' }}>
                                  <span title={row.hinweise.join(', ')} style={{ cursor: 'help' }}>
                                    ℹ️
                                  </span>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  title="Beleg bearbeiten"
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => recalculateSingle(row.belegId)}
                                  title="Neu berechnen"
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  🔄
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Summenzeile */}
                      <tfoot>
                        <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '600' }}>
                          <td colSpan={4} style={{ padding: '12px', textAlign: 'right', borderTop: '2px solid #e5e7eb' }}>
                            <strong>Summe:</strong>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', borderTop: '2px solid #e5e7eb' }}>
                            <strong>{fmtEUR(summe)}</strong>
                          </td>
                          <td colSpan={3} style={{ padding: '12px', borderTop: '2px solid #e5e7eb' }}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    Keine umgelegten Belege für diese Einheit
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          padding: '40px',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
            Keine Daten verfügbar
          </h3>
          <p style={{ margin: 0 }}>
            Für das Jahr {jahr} liegen keine umgelegten Belege vor.
          </p>
        </div>
      )}
      
      {/* Footer mit Gesamtsummen */}
      {umlageData && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: '#fff',
          borderTop: '1px solid #e5e7eb',
          padding: '20px',
          marginTop: '20px',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Gesamtsumme: {fmtEUR(umlageData.grandTotal)}</strong>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                Summe aller Einheiten = Summe aller Belege (±0,01 €)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {umlageData.belegCount} Belege
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {filteredEinheiten.length} Einheiten
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuchhaltungUmlageNachEinheitenPage;
