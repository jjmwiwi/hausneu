import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { NAV } from '../../src/config/nav.config';
import { Zaehler, ZaehlerTyp, ZAHLERTYP_LABEL } from '../../src/types/zaehler.types';
import zaehlerService from '../../src/services/zaehler.service';
import ZaehlerModal from './ZaehlerModal';
import { useImmobilien } from '../contexts/ImmobilienContext';
import { selectEinheitenById } from '../state/selectors';
import { groupAndSortZaehler, createEinheitenForUI } from '../utils/zaehlerUtils';
import PageTitle from './ui/PageTitle';
import DebugPageId from './ui/DebugPageId';
import { PAGE_IDS } from '../../src/constants/pageIds';
import EinheitsZaehlerBlock from './EinheitsZaehlerBlock';

const ZaehlerUebersichtPage: React.FC = () => {
  // DIAGNOSE-OVERLAY: Render-Log
  console.debug('[UEBERSICHT] render');
  
  const navigate = useNavigate();
  const { wegId } = useParams();
  const { wegEinheiten, zaehler, loadZaehler, createZaehler, updateZaehler, deleteZaehler, purgeAllZaehler, refreshZaehler } = useImmobilien();
  
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZaehler, setEditingZaehler] = useState<Zaehler | null>(null);
  const [currentEinheitId, setCurrentEinheitId] = useState<string>('allgemein');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});

  // Einheiten aus dem Context (wie in AblesungenPage)
  const einheitenById = useMemo(() => selectEinheitenById(wegEinheiten), [wegEinheiten]);

  // Erstelle Einheiten-Array mit "allgemein" für Gemeinschaft
  const einheiten = useMemo(() => createEinheitenForUI(wegEinheiten), [wegEinheiten]);

  useEffect(() => {
    if (wegId) {
      loadData();
    }
  }, [wegId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await loadZaehler(wegId || 'test-weg');
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gruppiere Zähler nach Einheit und sortiere sie
  const zaehlerByEinheit = useMemo(() => {
    // STATIC GUARD: useMemo muss zaehler als Dependency haben!
    if (!zaehler) {
      console.error('[STATIC GUARD] FEHLER: zaehler ist undefined in useMemo!');
      throw new Error('STATIC GUARD: zaehler muss in useMemo verfügbar sein!');
    }
    
    // Debug-Logs für echte Anwendung (immer sichtbar)
    console.log('🔍 [ZaehlerUebersicht] DEBUG: Starte Gruppierung', { 
      zaehlerCount: zaehler?.length, 
      einheitenCount: einheiten?.length,
      wegEinheitenCount: wegEinheiten?.length,
      zaehlerIds: zaehler?.map(z => ({ id: z.id, einheitId: z.einheitId, zaehlernummer: z.zaehlernummer }))
    });
    
    // Safety-Net: uniqById vor Gruppierung/Render
    const safeZaehler = zaehler.filter((z, index, arr) => 
      arr.findIndex(item => item.id === z.id) === index
    );
    
    // Zusätzliches Safety-Net: Entferne temp-IDs, wenn der echte Server-Zähler bereits existiert
    // Das verhindert Doppelanzeigen nach dem Reconcile
    const cleanedZaehler = safeZaehler.filter(z => {
      // Wenn es ein temp-Zähler ist, prüfe ob der echte Server-Zähler bereits existiert
      if (z.id.startsWith('temp:')) {
        const hasServerEquivalent = safeZaehler.some(serverZ => 
          !serverZ.id.startsWith('temp:') && 
          serverZ.einheitId === z.einheitId && 
          serverZ.zaehlernummer === z.zaehlernummer &&
          serverZ.zaehlertyp === z.zaehlertyp
        );
        
        if (hasServerEquivalent) {
          console.warn('⚠️ [ZaehlerUebersicht] Temp-Zähler entfernt, da Server-Äquivalent bereits existiert:', {
            tempId: z.id,
            einheitId: z.einheitId,
            zaehlernummer: z.zaehlernummer
          });
          return false; // Entferne den temp-Zähler
        }
      }
      return true; // Behalte alle anderen Zähler
    });
    
    if (cleanedZaehler.length !== safeZaehler.length) {
      console.warn('⚠️ [ZaehlerUebersicht] Temp-Duplikate bereinigt', {
        before: safeZaehler.length,
        after: cleanedZaehler.length,
        removed: safeZaehler.length - cleanedZaehler.length
      });
    }
    
    if (cleanedZaehler.length !== zaehler.length) {
      console.warn('⚠️ [ZaehlerUebersicht] ID-Duplikate in zaehler gefunden und entfernt', {
        original: zaehler.length,
        unique: cleanedZaehler.length
      });
    }
    
    console.log('🔍 [ZaehlerUebersicht] DEBUG: Vor groupAndSortZaehler', { 
      cleanedZaehler: cleanedZaehler.map(z => ({ id: z.id, einheitId: z.einheitId, zaehlernummer: z.zaehlernummer })),
      wegEinheiten: wegEinheiten?.map(e => ({ id: e.id, titel: e.titel }))
    });
    
    // Verwende die neue groupAndSortZaehler-Funktion mit cleanedZaehler
    const groupedResult = groupAndSortZaehler(cleanedZaehler, wegEinheiten);
    
    console.log('🔍 [ZaehlerUebersicht] DEBUG: Nach groupAndSortZaehler', { 
      groupedResult: groupedResult.map(g => ({ 
        einheitId: g.einheit?.id, 
        einheitName: g.einheit?.titel || g.einheit?.name,
        itemsCount: g.items?.length || 0,
        items: g.items?.map(z => ({ id: z.id, zaehlernummer: z.zaehlernummer }))
      }))
    });
    
    // Konvertiere das Array-Ergebnis in eine Map für die bestehende Logik
    const zaehlerMap = new Map<string, Zaehler[]>();
    
    // Initialisiere alle Einheiten mit leeren Arrays
    einheiten.forEach(einheit => {
      zaehlerMap.set(einheit.id, []);
    });
    
    // Fülle die Map mit den gruppierten Zählern
    groupedResult.forEach(group => {
      if (group.einheit && group.items) {
        zaehlerMap.set(group.einheit.id, group.items);
      }
    });
    
    console.log('🔍 [ZaehlerUebersicht] DEBUG: Gruppierung abgeschlossen', {
      zaehlerCount: cleanedZaehler.length,
      einheitenCount: einheiten.length,
      gruppenCount: groupedResult.length,
      mapKeys: Array.from(zaehlerMap.keys()),
      mapValues: Array.from(zaehlerMap.values()).map(items => items.length),
      totalZaehlerInMap: Array.from(zaehlerMap.values()).reduce((sum, items) => sum + items.length, 0)
    });
    
    return zaehlerMap;
  }, [zaehler, einheiten, wegEinheiten]);

  // Debug-Log für Zähler-Sync
  useEffect(() => {
    console.debug('[ZAHLER-UEBERSICHT] count', zaehler?.length, { wegId, jahr: new Date().getFullYear() });
    console.debug('[LIST] zaehler ids', zaehler?.map(z => z.id));
    
    // Spezieller Log für tempIds (Optimistic Updates)
    const tempIds = zaehler?.filter(z => z.id.startsWith('temp:')).map(z => z.id) || [];
    if (tempIds.length > 0) {
      console.debug('[OPTIMISTIC] tempIds gefunden:', tempIds);
    }
  }, [zaehler, wegId]);

  // DIAGNOSE-OVERLAY: Reaktive Kette sichtbar machen
  useEffect(() => {
    console.debug('[UEBERSICHT] len', zaehler?.length, zaehler?.map(z => z.id));
  }, [zaehler]);

  // RE-RENDER-BEWEIS: Provider → Consumer (End-to-End)
  useEffect(() => {
    console.debug('[UEBERSICHT] zaehler geändert - Länge:', zaehler?.length, 'IDs:', zaehler?.map(z => z.id));
    
    // PERFORMANCE PROBE: Bei 300+ Zählern Performance messen
    if (zaehler && zaehler.length >= 300) {
      const renderStart = performance.now();
      
      // Messung: Time to temp render
      const tempIds = zaehler.filter(z => z.id.startsWith('temp:'));
      if (tempIds.length > 0) {
        const tempRenderTime = performance.now() - renderStart;
        console.log(`[PERFORMANCE] Time to temp render: ${tempRenderTime.toFixed(2)}ms`);
        
        // ALARM: Wenn > 100ms
        if (tempRenderTime > 100) {
          console.warn(`[PERFORMANCE ALARM] Temp render zu langsam: ${tempRenderTime.toFixed(2)}ms > 100ms`);
          console.warn(`[PERFORMANCE] Row-Virtualization empfohlen für ${zaehler.length} Zähler`);
        }
      }
    }
  }, [zaehler]);

  // Sortiere Einheiten: Allgemein zuerst, dann nach Ordnung
  const sortedEinheiten = useMemo(() => {
    return [...einheiten].sort((a, b) => {
      if (a.id === 'allgemein') return -1;
      if (b.id === 'allgemein') return 1;
      return (a.ordnung || 0) - (b.ordnung || 0);
    });
  }, [einheiten]);

  const handleOpenModal = (einheitId: string, zaehler?: Zaehler) => {
    setCurrentEinheitId(einheitId);
    setEditingZaehler(zaehler || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingZaehler(null);
  };

  const handleSaveZaehler = async (savedZaehler: Zaehler) => {
    console.debug('[SAVE] received zaehler', savedZaehler);
    console.debug('[SAVE] current zaehler count before', zaehler?.length);
    
    try {
      if (editingZaehler) {
        // Update
        console.debug('[SAVE] updating existing zaehler', editingZaehler.id);
        await updateZaehler(wegId || 'test-weg', savedZaehler.id, savedZaehler);
      } else {
        // Create - OPTIMISTIC UPDATE
        console.debug('[SAVE] creating new zaehler - OPTIMISTIC UPDATE');
        
        // STATIC GUARD: Kein await createZaehler in Komponenten!
        // createZaehler wird ohne await aufgerufen (fire-and-forget)
        // Das Optimistic-Insert passiert im Context, nicht hier
        
        // OPTIMISTIC UPDATE: Füge sofort zum Context hinzu
        // Das macht den neuen Zähler sofort sichtbar
        // Der Context macht den Optimistic Update, wir müssen nichts tun
        
        // Server-Call im Hintergrund (ohne await für sofortige UI-Aktualisierung)
        createZaehler(wegId || 'test-weg', savedZaehler).catch(error => {
          console.error('[SAVE] Fehler beim Server-Call:', error);
          // Bei Fehler wird der Context automatisch zurückgesetzt
        });
        
        console.debug('[SAVE] Optimistic Update gestartet, neuer Zähler sollte sofort sichtbar sein');
        
        // Modal sofort schließen - der neue Zähler ist bereits sichtbar
        handleCloseModal();
        return; // Beende hier, da wir das Modal bereits geschlossen haben
      }
      
      console.debug('[SAVE] current zaehler count after', zaehler?.length);
      
      // Aktualisiere editingNotes
      setEditingNotes(prev => ({
        ...prev,
        [savedZaehler.id]: savedZaehler.notiz || ''
      }));
      
      // Schließe das Modal
      handleCloseModal();
    } catch (error) {
      console.error('[SAVE] Fehler beim Speichern:', error);
    }
  };

  const handleDeleteZaehler = async (zaehlerId: string, bezeichnung: string) => {
    if (!window.confirm(`Zähler '${bezeichnung}' wirklich löschen? Dies kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      await deleteZaehler(wegId || 'test-weg', zaehlerId);
      
      // Entferne aus editingNotes
      setEditingNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[zaehlerId];
        return newNotes;
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Zählers:', error);
      alert('Fehler beim Löschen des Zählers');
    }
  };

  const handleNoteChange = (zaehlerId: string, note: string) => {
    // Stelle sicher, dass der ursprüngliche Text nicht angehängt wird
    setEditingNotes(prev => ({ ...prev, [zaehlerId]: note }));
  };

  const handleNoteSave = async (zaehlerId: string) => {
    const note = editingNotes[zaehlerId];
    if (note === undefined) return;

    try {
      setSavingNotes(prev => ({ ...prev, [zaehlerId]: true }));
      
      const updatedZaehler = await zaehlerService.updateNote(zaehlerId, note);
      
      // KEIN refreshZaehler mehr - das würde den Optimistic Update überschreiben!
      // Der Context wird automatisch aktualisiert
      
      // Zeige Erfolgsindikator
      setTimeout(() => {
        setSavingNotes(prev => ({ ...prev, [zaehlerId]: false }));
      }, 1000);
    } catch (error) {
      console.error('Fehler beim Speichern der Notiz:', error);
      setSavingNotes(prev => ({ ...prev, [zaehlerId]: false }));
      
      // Revertiere zur ursprünglichen Notiz
      const originalZaehler = zaehler.find(z => z.id === zaehlerId);
      if (originalZaehler) {
        setEditingNotes(prev => ({ ...prev, [zaehlerId]: originalZaehler.notiz || '' }));
      }
    }
  };

  const handleNoteBlur = (zaehlerId: string) => {
    const originalZaehler = zaehler.find(z => z.id === zaehlerId);
    const currentNote = editingNotes[zaehlerId];
    
    if (originalZaehler && currentNote !== undefined && currentNote !== originalZaehler.notiz) {
      console.log('[ZaehlerUebersicht] Notiz geändert, speichere...', { 
        zaehlerId, 
        original: originalZaehler.notiz, 
        current: currentNote 
      });
      handleNoteSave(zaehlerId);
    }
  };

  // Initialisiere editingNotes nur einmal
  useEffect(() => {
    if (zaehler && Array.isArray(zaehler) && zaehler.length > 0) {
      const notes: Record<string, string> = {};
      zaehler.forEach(z => {
        notes[z.id] = z.notiz || '';
      });
      setEditingNotes(notes);
    }
  }, []); // Leere Dependency-Array - nur einmal ausführen

  if (loading) {
    return (
      <div className="p-6">
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
            Lade Zählerübersicht...
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => navigate(`/immobilien/${wegId || 'test-weg'}${NAV.WEG.ZAEHLER.path}`)}
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              marginBottom: '16px'
            }}
          >
            ← Zurück zu Zählerstand
          </button>
          <PageTitle 
            title={NAV.WEG.ZAEHLER.UEBERSICHT.label} 
            extra={<DebugPageId id={PAGE_IDS.ZAEHLER_UEBERSICHT} />}
          />
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '16px',
            color: '#6b7280'
          }}>
            Übersicht aller Zähler und deren Konfiguration
          </p>
          
          {/* Development: Danger Zone */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px'
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#dc2626'
              }}>
                🚨 Development Zone
              </h3>
              <button
                onClick={async () => {
                  if (window.confirm('ALLE Zähler für diese WEG löschen? Dies kann nicht rückgängig gemacht werden!')) {
                    try {
                      const count = await purgeAllZaehler(wegId || 'test-weg');
                      alert(`${count} Zähler gelöscht.`);
                      // Kein window.location.reload() mehr nötig, da der Context aktualisiert wird
                    } catch (error) {
                      console.error('Fehler beim Löschen:', error);
                      alert('Fehler beim Löschen der Zähler');
                    }
                  }
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid #dc2626',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🗑️ Alle Zähler löschen ({zaehler.length})
              </button>
            </div>
          )}
        </div>

        {/* Zählerübersicht */}
        {sortedEinheiten.map(einheit => {
          const einheitZaehler = zaehlerByEinheit.get(einheit.id) || [];
          const isAllgemein = einheit.id === 'allgemein';
          
          return (
            <div key={einheit.id} style={{
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
                  Einheit: {einheit.id === 'allgemein' ? 'Allgemein' : (einheit.titel || einheit.name || 'Unbekannt')}
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  Mieter: {einheit.mieter || einheit.mieterName || 'Eigentümer'}
                </p>
              </div>

              {/* Tabelle */}
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
                        Notiz
                      </th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {einheitZaehler.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{
                          padding: '40px 16px',
                          textAlign: 'center',
                          color: '#6b7280',
                          fontSize: '14px'
                        }}>
                          Keine Zähler vorhanden.
                        </td>
                      </tr>
                    ) : (
                      einheitZaehler.map(zaehler => (
                        <tr key={zaehler.id} style={{
                          borderBottom: '1px solid #f3f4f6'
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
                            {ZAHLERTYP_LABEL[zaehler.zaehlertyp]}
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
                              <textarea
                                value={editingNotes[zaehler.id] || ''}
                                onChange={(e) => handleNoteChange(zaehler.id, e.target.value)}
                                onBlur={() => handleNoteBlur(zaehler.id)}
                                style={{
                                  width: '100%',
                                  minHeight: '32px',
                                  padding: '6px 8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                  resize: 'vertical',
                                  fontFamily: 'inherit'
                                }}
                                placeholder="Notiz hinzufügen..."
                                data-testid={`note-input-${zaehler.id}`}
                              />
                              {savingNotes[zaehler.id] && (
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '8px',
                                  fontSize: '12px',
                                  color: '#10b981'
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'center'
                          }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleOpenModal(einheit.id, zaehler)}
                                style={{
                                  padding: '8px',
                                  border: '1px solid #3b82f6',
                                  backgroundColor: 'white',
                                  color: '#3b82f6',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                aria-label="Bearbeiten"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteZaehler(zaehler.id, zaehler.bezeichnung)}
                                style={{
                                  padding: '8px',
                                  border: '1px solid #ef4444',
                                  backgroundColor: 'white',
                                  color: '#ef4444',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                aria-label="Löschen"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer mit "Zähler anlegen" Button */}
              <div style={{
                padding: '16px 24px',
                backgroundColor: '#f9fafb',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => handleOpenModal(einheit.id)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    border: '1px solid #3b82f6',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  + Zähler anlegen
                </button>
              </div>
            </div>
          );
        })}

        {/* Modal */}
        <ZaehlerModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveZaehler}
          zaehler={editingZaehler}
          einheiten={einheiten}
          currentEinheitId={currentEinheitId}
          wegId={wegId || 'test-weg'}
        />
      </div>
    </div>
  );
};

export default ZaehlerUebersichtPage;
