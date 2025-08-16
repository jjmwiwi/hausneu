import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageTitle } from '../ui/PageTitle';
import DebugPageId from '../ui/DebugPageId';
import { PAGE_IDS } from '../../../src/constants/pageIds';

const BuchhaltungBelegePage: React.FC = () => {
  const navigate = useNavigate();
  const { wegId } = useParams<{ wegId: string }>();
  const [searchParams] = useSearchParams();
  
  const handleUmlageClick = () => {
    const jahr = searchParams.get('jahr') || new Date().getFullYear().toString();
    navigate(`/immobilien/${wegId}/buchhaltung/umlage/nach-einheiten?jahr=${jahr}`);
  };

  const handleAddNew = async () => {
    try {
      await (window as any).api.invoke("belege:openCreateWindow");
    } catch (error) {
      console.error('Fehler beim Öffnen des Popup-Fensters:', error);
    }
  };

  return (
    <div>
      <PageTitle 
        title="Buchhaltung – Belege"
        extra={
          <div style={{ display: 'flex', gap: '12px' }}>
            <DebugPageId id={PAGE_IDS.BUCHHALTUNG_BELEGE} />
            <button
              onClick={handleUmlageClick}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              data-testid="btn-umlage-nach-einheiten"
            >
              📊 Umlage nach Einheiten
            </button>
            <button
              onClick={handleAddNew}
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
              data-testid="btn-neuer-beleg"
            >
              + Neuer Beleg
            </button>
          </div>
        }
      />
      
      <div style={{
        padding: '24px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        marginTop: '20px'
      }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
            Belege-Verwaltung
          </h3>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Hier werden alle Belege für die Buchhaltung verwaltet.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuchhaltungBelegePage;
