import React from 'react';

const WelcomePage: React.FC = () => {
  return (
    <div className="p-6" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '48px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h1 className="text-gray-900" style={{ margin: '0 0 24px 0', fontSize: '36px', fontWeight: '700' }}>
          Willkommen bei der Hausverwaltung
        </h1>
        
        <p className="text-gray-500" style={{ margin: '0 0 32px 0', fontSize: '18px', lineHeight: '1.6' }}>
          Professionelle Verwaltung Ihrer Immobilien mit umfassenden Funktionen für Betriebskostenabrechnung, 
          Zählerstandsverwaltung und mehr.
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '24px',
          marginTop: '40px'
        }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              🏢
            </div>
            <h3 className="text-gray-900" style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>
              Immobilienverwaltung
            </h3>
            <p className="text-gray-500" style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
              Verwalten Sie Ihre Immobilien mit detaillierten Stammdaten und Übersichten.
            </p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              📊
            </div>
            <h3 className="text-gray-900" style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>
              Zählerstände
            </h3>
            <p className="text-gray-500" style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
              Erfassen und verwalten Sie alle Zählerstände für eine präzise Abrechnung.
            </p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              📈
            </div>
            <h3 className="text-gray-900" style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>
              Betriebskostenabrechnung
            </h3>
            <p className="text-gray-500" style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
              Erstellen Sie detaillierte Betriebskostenabrechnungen mit Heizkostenverteilung.
            </p>
          </div>
        </div>

        <div style={{ 
          marginTop: '40px',
          padding: '24px',
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          border: '1px solid #bfdbfe'
        }}>
          <p style={{ 
            margin: '0', 
            color: '#1e40af',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            💡 <strong>Tipp:</strong> Klicken Sie auf "Immobilien" in der linken Seitenleiste, 
            um mit der Verwaltung Ihrer Immobilien zu beginnen.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
