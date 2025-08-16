import React, { useState, useMemo } from 'react';
import { useImmobilien, Beleg } from '../contexts/ImmobilienContext';
import BelegFormModal from './BelegFormModal';
import PageTitle from './ui/PageTitle';
import DebugPageId from './ui/DebugPageId';
import { PAGE_IDS } from '../../src/constants/pageIds';
import { formatCurrency, formatDate } from '../utils/belegUtils';

const BelegePage: React.FC = () => {
  const { belege, createBeleg, updateBeleg, deleteBeleg, recalculateUmlage, kostenarten, wegEinheiten, selectedWegId } = useImmobilien();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBeleg, setEditingBeleg] = useState<Beleg | null>(null);
  


  // Filtere Belege nach der ausgewählten WEG
  const filteredBelege = useMemo(() => {
    if (!selectedWegId) return [];
    return belege.filter(b => b.wegId === selectedWegId);
  }, [belege, selectedWegId]);

  // Sortiere Belege nach Datum (neueste zuerst)
  const sortedBelege = useMemo(() => {
    return [...filteredBelege].sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }, [filteredBelege]);

  const handleAddNew = () => {
    // Prüfe ob eine WEG ausgewählt ist
    if (!selectedWegId) {
      alert('Bitte wählen Sie zuerst eine WEG aus, bevor Sie einen neuen Beleg erstellen.');
      return;
    }
    
    setEditingBeleg(null);
    setIsModalOpen(true);
  };

  const handleEdit = (beleg: Beleg) => {
    setEditingBeleg(beleg);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Möchten Sie diesen Beleg wirklich löschen?')) {
      try {
        await deleteBeleg(id);
      } catch (error) {
        console.error('Fehler beim Löschen des Belegs:', error);
        alert('Fehler beim Löschen des Belegs');
      }
    }
  };

  const handleSave = async (belegData: Omit<Beleg, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.info('[PAGE] handleSave called with:', belegData);
      
      if (editingBeleg) {
        // Bestehenden Beleg aktualisieren
        await updateBeleg(editingBeleg.id, belegData);
      } else {
        // Neuen Beleg erstellen
        await createBeleg(belegData);
      }
      
      console.info('[PAGE] Beleg erfolgreich gespeichert');
      setIsModalOpen(false);
      setEditingBeleg(null);
    } catch (error) {
      console.error('[PAGE] Fehler beim Speichern des Belegs:', error);
      alert(`Fehler beim Speichern des Belegs: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBeleg(null);
  };

  const handleRecalculateUmlage = async (belegId: string) => {
    try {
      await recalculateUmlage(belegId);
      // Beleg in der Bearbeitung aktualisieren, falls er gerade bearbeitet wird
      if (editingBeleg && editingBeleg.id === belegId) {
        const updatedBeleg = belege.find(b => b.id === belegId);
        if (updatedBeleg) {
          setEditingBeleg(updatedBeleg);
        }
      }
    } catch (error) {
      console.error('Fehler bei der Umlage-Berechnung:', error);
      alert('Fehler bei der Umlage-Berechnung');
    }
  };

  const handleUmlageNachEinheiten = (beleg: Beleg) => {
    // Navigation zur Umlage-Übersicht nach Einheiten
    // Hier würde normalerweise die Navigation zur entsprechenden Seite erfolgen
    console.log(`Navigation zur Umlage-Übersicht für Beleg ${beleg.id} (Jahr ${beleg.jahr})`);
    
    // Für jetzt: Öffne ein Modal mit den Umlage-Details
    alert(`Umlage-Übersicht für ${beleg.belegname} (${beleg.jahr})\n\n` +
          `Verteilerschlüssel: ${getVerteilschluesselLabel(beleg.verteilschluesselId)}\n` +
          `Einheiten: ${beleg.umlageSnapshot?.anteile.length || 0}\n` +
          `Gesamtbetrag: ${formatCurrency(beleg.umlageSnapshot?.summe || 0)}`);
  };

  const getKostenartName = (kostenartId: string): string => {
    const kostenart = kostenarten.find(k => k.id === kostenartId);
    return kostenart?.name || 'Unbekannt';
  };

  const getVerteilschluesselLabel = (schluessel: string): string => {
    const labels: Record<string, string> = {
      'MEA': 'Miteigentumsanteil',
      'WOHNFLAECHE': 'Wohnfläche',
      'VERBRAUCH_STROM': 'Strom',
      'ANZAHL_WOHNUNGEN': 'Anzahl Wohnungen',
      'INDIVIDUELL': 'Individuelle Zuweisung',
      'VERBRAUCH_WAERME': 'Wärmeverbrauch',
      'VERBRAUCH_WASSER': 'Wasserverbrauch'
    };
    return labels[schluessel] || schluessel;
  };

  const getUmlageStatus = (beleg: Beleg) => {
    if (!beleg.umlageSnapshot) {
      return (
        <span style={{
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          color: '#6b7280',
          backgroundColor: '#f3f4f6'
        }}>
          ⏳ Wird berechnet...
        </span>
      );
    }

    // Prüfe auf Fehler
    const hasErrors = beleg.umlageSnapshot.anteile.length === 0 || 
                     (beleg.umlageSnapshot.hinweise && beleg.umlageSnapshot.hinweise.some(h => 
                       h.includes('Keine Basiswerte') || h.includes('Fehler')
                     ));

    if (hasErrors) {
      return (
        <span style={{
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          color: '#dc2626',
          backgroundColor: '#fee2e2'
        }} title={`Fehler: ${beleg.umlageSnapshot.hinweise?.join(', ') || 'Keine Basiswerte'}`}>
          ❌ Fehler
        </span>
      );
    }

    // Prüfe Quelle
    if (beleg.umlageQuelle === 'manuell') {
      return (
        <span style={{
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          color: '#6b7280',
          backgroundColor: '#f3f4f6'
        }} title={`Manuell: ${beleg.verteilschluesselId} (${beleg.jahr})`}>
          🔧 Manuell
        </span>
      );
    }

    // Auto - erfolgreich
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#059669',
        backgroundColor: '#d1fae5'
      }} title={`Auto: ${beleg.verteilschluesselId} (${beleg.jahr}) - ${beleg.umlageSnapshot.anteile.length} Einheiten`}>
        ✅ Auto
      </span>
    );
  };

  if (!selectedWegId) {
    return (
      <div className="p-6">
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <PageTitle 
            title="Belege" 
            extra={<DebugPageId id={PAGE_IDS.BELEGE} />}
          />
          <div style={{ padding: '60px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
              Keine WEG ausgewählt
            </h3>
            <p style={{ margin: 0, fontSize: '16px' }}>
              Bitte wählen Sie eine WEG aus, um Belege zu verwalten.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header mit Titel und Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <PageTitle 
            title="Belege" 
            extra={<DebugPageId id={PAGE_IDS.BELEGE} />}
          />
          
          <button
            onClick={handleAddNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '16px' }}>➕</span>
            Neuer Beleg
          </button>
        </div>

        {/* Belege Tabelle */}
        <div className="card">
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                                 <tr style={{ 
                   backgroundColor: '#f9fafb', 
                   borderBottom: '2px solid var(--border)',
                   textAlign: 'left'
                 }}>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Datum</th>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Belegname *</th>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Anhang</th>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Belegbetrag (EUR)</th>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Kostenart</th>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Steuerliche Kostenart</th>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Zeitraum</th>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Abgerechnet</th>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Umlage</th>
                   <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Aktionen</th>
                 </tr>
              </thead>
              <tbody>
                {sortedBelege.map((beleg) => (
                  <tr key={beleg.id} style={{ 
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'white'
                  }}>
                                         <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       {formatDate(beleg.datum)}
                     </td>
                     <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       <div style={{ fontWeight: '500' }}>{beleg.belegname}</div>
                     </td>
                     <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       {beleg.anhang ? (
                         <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                           📎 {beleg.anhang.name}
                         </div>
                       ) : (
                         <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                           —
                         </div>
                       )}
                     </td>
                     <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       <div style={{ fontWeight: '500' }}>{formatCurrency(beleg.betragBrutto)}</div>
                       <div style={{ fontSize: '12px', color: '#6b7280' }}>
                         Netto: {formatCurrency(beleg.netto)}
                       </div>
                     </td>
                     <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       {getKostenartName(beleg.kostenartId)}
                     </td>
                     <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       {beleg.steuerlicheKostenart || (
                         <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                           —
                         </div>
                       )}
                     </td>
                     <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       {formatDate(beleg.periodeVon)} – {formatDate(beleg.periodeBis)}
                     </td>
                     <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       <span style={{
                         padding: '4px 8px',
                         borderRadius: '12px',
                         fontSize: '12px',
                         fontWeight: '500',
                         color: beleg.abgerechnet ? '#059669' : '#6b7280',
                         backgroundColor: beleg.abgerechnet ? '#d1fae5' : '#f3f4f6'
                       }}>
                         {beleg.abgerechnet ? 'Ja' : 'Nein'}
                       </span>
                     </td>
                     <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       {getUmlageStatus(beleg)}
                     </td>
                                         <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                       <div style={{ display: 'flex', gap: '8px' }}>
                         <button
                           onClick={() => handleEdit(beleg)}
                           style={{
                             background: 'none',
                             border: 'none',
                             cursor: 'pointer',
                             padding: '4px',
                             borderRadius: '4px',
                             color: '#3b82f6'
                           }}
                           title="Bearbeiten"
                         >
                           ✏️
                         </button>
                         <button
                           onClick={() => handleDelete(beleg.id)}
                           style={{
                             background: 'none',
                             border: 'none',
                             cursor: 'pointer',
                             padding: '4px',
                             borderRadius: '4px',
                             color: '#ef4444'
                           }}
                           title="Löschen"
                         >
                           🗑️
                         </button>
                         {beleg.umlageSnapshot && (
                           <button
                             onClick={() => handleUmlageNachEinheiten(beleg)}
                             style={{
                               background: 'none',
                               border: 'none',
                               cursor: 'pointer',
                               padding: '4px',
                               borderRadius: '4px',
                               color: '#8b5cf6'
                             }}
                             title="Umlage nach Einheiten anzeigen"
                           >
                             📊
                           </button>
                         )}
                       </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Leerer Zustand */}
          {sortedBelege.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
                Keine Belege vorhanden
              </h3>
              <p style={{ margin: 0, fontSize: '16px' }}>
                Klicken Sie auf "Neuer Beleg" um den ersten Beleg zu erstellen.
              </p>
            </div>
          )}
        </div>

        {/* Zusammenfassung */}
        {sortedBelege.length > 0 && (
          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              Zusammenfassung
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Anzahl Belege</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>{sortedBelege.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Gesamtbetrag (brutto)</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>
                  {formatCurrency(sortedBelege.reduce((sum, b) => sum + b.betragBrutto, 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Gesamtbetrag (netto)</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>
                  {formatCurrency(sortedBelege.reduce((sum, b) => sum + b.netto, 0))}
                </div>
              </div>
                             <div>
                 <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Umlage-Status</div>
                 <div style={{ fontSize: '14px' }}>
                   {sortedBelege.filter(b => b.umlageSnapshot && !b.umlageSnapshot.hinweise?.some(h => h.includes('Fehler'))).length} OK,{' '}
                   {sortedBelege.filter(b => b.umlageSnapshot && b.umlageSnapshot.hinweise?.some(h => h.includes('Fehler'))).length} Fehler
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal für neue/bearbeiten Beleg */}
      {isModalOpen && selectedWegId && kostenarten && wegEinheiten && (
        <BelegFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          onRecalculateUmlage={handleRecalculateUmlage}
          beleg={editingBeleg}
          kostenarten={kostenarten}
          wegEinheiten={wegEinheiten}
          selectedWegId={selectedWegId}
        />
      )}
    </div>
  );
};

export default BelegePage;
