import React, { useState, useMemo } from 'react';
import { useImmobilien, Kostenart } from '../contexts/ImmobilienContext';
import KostenartFormModal from './KostenartFormModal';
// PAGE_IDS nicht mehr benötigt, da DebugPageId entfernt wurde
// DebugPageId entfernt - Debug-Fenster wird nicht mehr angezeigt
import PageTitle from './ui/PageTitle';
import DebugPageId from './ui/DebugPageId';
import { PAGE_IDS } from '../../src/constants/pageIds';

const KostenartenPage: React.FC = () => {
  const { kostenarten, updateKostenarten, updateKostenart } = useImmobilien();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sortiere Kostenarten alphabetisch nach Name
  const sortedKostenarten = useMemo(() => {
    return [...kostenarten].sort((a, b) => a.name.localeCompare(b.name));
  }, [kostenarten]);

  const handleAddNew = () => {
    setIsModalOpen(true);
  };

  const handleSave = (kostenart: Kostenart) => {
    if (kostenart.id.startsWith('new-')) {
      // Neue Kostenart - generiere neue ID
      const newKostenart: Kostenart = {
        ...kostenart,
        id: `kostenart-${Date.now()}`
      };
      updateKostenarten([...kostenarten, newKostenart]);
    } else {
      // Bestehende Kostenart aktualisieren
      updateKostenart(kostenart.id, kostenart);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Möchten Sie diese Kostenart wirklich löschen?')) {
      const updatedKostenarten = kostenarten.filter(k => k.id !== id);
      updateKostenarten(updatedKostenarten);
    }
  };

  const handleVerteilschluesselChange = (id: string, newSchluessel: string) => {
    updateKostenart(id, { verteilschluesselId: newSchluessel as any });
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

  const verteilschluesselOptions = [
    { value: 'MEA', label: 'Miteigentumsanteil' },
    { value: 'WOHNFLAECHE', label: 'Wohnfläche' },
    { value: 'VERBRAUCH_STROM', label: 'Strom' },
    { value: 'ANZAHL_WOHNUNGEN', label: 'Anzahl Wohnungen' },
    { value: 'INDIVIDUELL', label: 'Individuelle Zuweisung' },
    { value: 'VERBRAUCH_WAERME', label: 'Wärmeverbrauch' },
    { value: 'VERBRAUCH_WASSER', label: 'Wasserverbrauch' }
  ];

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
            title="Kostenarten" 
            extra={<DebugPageId id={PAGE_IDS.KOSTENARTEN} />}
          />
          
          <button
            onClick={handleAddNew}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              padding: '10px 16px'
            }}
          >
            <span style={{ fontSize: '16px' }}>➕</span>
            Neue Kostenart
          </button>
        </div>

        {/* Kostenarten Tabelle */}
        <div className="card">
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f9fafb', 
                  borderBottom: '2px solid var(--border)',
                  textAlign: 'left'
                }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Kostenart</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Verteilerschlüssel</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {sortedKostenarten.map((kostenart) => (
                  <tr key={kostenart.id} style={{ 
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'white'
                  }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      {kostenart.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                                             <select
                         value={kostenart.verteilschluesselId}
                         onChange={(e) => handleVerteilschluesselChange(kostenart.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          fontSize: '14px'
                        }}
                      >
                        {verteilschluesselOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <button
                        onClick={() => handleDelete(kostenart.id)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Leerer Zustand */}
          {sortedKostenarten.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
                Keine Kostenarten vorhanden
              </h3>
              <p style={{ margin: 0, fontSize: '16px' }}>
                Klicken Sie auf "Neue Kostenart" um die erste Kostenart zu erstellen.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal für neue Kostenart */}
      <KostenartFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

export default KostenartenPage;

