import React, { useState, useMemo, useEffect } from 'react';
import BelegErfassungModal from './BelegErfassungModal';
import PageTitle from './ui/PageTitle';
import DebugPageId from './ui/DebugPageId';
import { PAGE_IDS } from '../../src/constants/pageIds';

// Hilfsfunktionen für Formatierung
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('de-DE');
  } catch {
    return dateString;
  }
};

const BelegePage: React.FC = () => {
  const [belege, setBelege] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sortiere Belege nach Datum (neueste zuerst)
  const sortedBelege = useMemo(() => {
    return [...belege].sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }, [belege]);

  // Belege aus der Datenbank laden
  const loadBelege = async () => {
    try {
      setIsLoading(true);
      const items = await (window as any).api.invoke("belege:list");
      setBelege(items);
    } catch (error) {
      console.error('Fehler beim Laden der Belege:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Belege beim ersten Laden und nach Änderungen neu laden
  useEffect(() => {
    loadBelege();
  }, []);

  const handleAddNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaved = () => {
    setIsModalOpen(false);
    loadBelege(); // Liste neu laden
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <PageTitle 
            title="Belege" 
            extra={<DebugPageId id={PAGE_IDS.BELEGE} />}
          />
          <div style={{ padding: '60px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
              Lade Belege...
            </h3>
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
                  <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Verwendungszweck</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Betrag (EUR)</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Kostenart</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Belegnummer</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Notizen</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Erstellt</th>
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
                      <div style={{ fontWeight: '500' }}>{beleg.verwendungszweck}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>{formatCurrency(beleg.betrag)}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      {beleg.kostenartName || 'Unbekannt'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      {beleg.belegnummer || (
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          —
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      {beleg.notizen || (
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          —
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      {formatDate(beleg.createdAt)}
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
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Gesamtbetrag</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>
                  {formatCurrency(sortedBelege.reduce((sum, b) => sum + b.betrag, 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Durchschnittlicher Betrag</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>
                  {formatCurrency(sortedBelege.reduce((sum, b) => sum + b.betrag, 0) / sortedBelege.length)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal für neue Belege */}
      {isModalOpen && (
        <BelegErfassungModal
          open={isModalOpen}
          onClose={handleCloseModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default BelegePage;
