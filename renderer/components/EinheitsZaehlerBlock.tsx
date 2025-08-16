import React, { useState } from 'react';
import { Zaehler, ZaehlerTyp, ZAHLERTYP_LABEL } from '../../src/types/zaehler.types';

interface Zaehler {
  id: string;
  wegId: string;
  zaehlernummer: string;
  bezeichnung: string;
  zaehlertyp: ZaehlerTyp;
  zaehlertypEinheit: string | null;
  standort: string;
  einheitId: string;
  notiz: string;
  startwert?: number | null;
  ablesewert?: number | null;
}

interface WEGEinheit {
  id: string;
  titel: string;
  wohnungsnummer: number;
  mieter?: string;
}

interface EinheitsZaehlerBlockProps {
  einheitId: string;
  einheitenById: Record<string, WEGEinheit>;
  zaehler: Zaehler[];
  onNotizChange: (id: string, notiz: string) => void;
  onEdit: (zaehler: Zaehler) => void;
  onDelete: (id: string) => void;
  onAddNew: (einheitId: string) => void;
  isHausZaehler?: boolean;
}

const EinheitsZaehlerBlock: React.FC<EinheitsZaehlerBlockProps> = ({
  einheitId,
  einheitenById,
  zaehler,
  onNotizChange,
  onEdit,
  onDelete,
  onAddNew,
  isHausZaehler = false
}) => {

  // Zähler nach Zählernummer numerisch sortieren
  const sortedZaehler = [...zaehler].sort((a, b) => {
    const numA = parseInt(a.zaehlernummer.replace(/\D/g, ''));
    const numB = parseInt(b.zaehlernummer.replace(/\D/g, ''));
    return numA - numB;
  });

  // Spezielle Behandlung für Hauszähler
  if (isHausZaehler) {
    const mieterAnzeige = 'Gemeinschaft';
    const einheitAnzeige = 'Allgemein';
    
    return (
      <div className="card" style={{ marginBottom: '32px' }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px'
          }}>
            {/* Linke Seite - Metadaten */}
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                alignItems: 'center'
              }}>
                {/* Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Auswählen</span>
                </div>

                {/* Einheit */}
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Einheit
                  </label>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    {einheitAnzeige}
                  </div>
                </div>

                {/* Mieter */}
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Mieter
                  </label>
                  <div style={{ fontSize: '16px', color: '#111827' }}>
                    {mieterAnzeige}
                  </div>
                </div>
              </div>
            </div>

            {/* Rechte Seite - Neuer Zähler Button */}
            <div>
              <button
                onClick={() => onAddNew('haus')}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  padding: '10px 16px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontSize: '16px' }}>➕</span>
                Neuer Zähler
              </button>
            </div>
          </div>
        </div>

        {/* Tabelle */}
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ 
                backgroundColor: '#f9fafb', 
                borderBottom: '2px solid var(--border)',
                textAlign: 'left'
              }}>
                <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Zählernummer</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Bezeichnung</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Zählertyp</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Standort</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Notiz</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {zaehler.map((z) => (
                <tr key={z.id} style={{ 
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'white'
                }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{z.zaehlernummer}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{z.bezeichnung}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{z.zaehlertyp}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{z.standort}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    <input
                      type="text"
                      value={z.notiz}
                      onChange={(e) => onNotizChange(z.id, e.target.value)}
                      placeholder="Notiz eingeben..."
                      style={{
                        width: '100%',
                        border: '1px solid transparent',
                        background: 'transparent',
                        fontSize: '14px',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '1px solid var(--border)';
                        e.target.style.background = 'white';
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid transparent';
                        e.target.style.background = 'transparent';
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => onEdit(z)}
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
                        onClick={() => onDelete(z.id)}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leerer Zustand wenn keine Zähler vorhanden */}
        {zaehler.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Keine Hauszähler vorhanden
            </p>
          </div>
        )}
      </div>
    );
  }

  // Normale Behandlung für WEG-Einheiten
  // Hole die aktuelle Einheit aus dem Dictionary - Single Source of Truth
  const einheit = einheitenById[einheitId];
  
  // Live-Datenquelle erzwingen - nur aus WEG-Einheiten
  const mieterAnzeige = einheit?.mieter ?? '—';
  const einheitAnzeige = einheit ? `${einheit.titel} Nr. ${einheit.wohnungsnummer}` : '—';
  
  // Schutz & Dev-Warnung - nie alte Strings anzeigen
  if (!einheit) {
    console.warn('Einheit nicht gefunden', { einheitId });
    return (
      <div className="card" style={{ marginBottom: '32px', border: '2px solid #f59e0b', backgroundColor: '#fef3c7' }}>
        <div style={{ padding: '20px', textAlign: 'center', color: '#92400e' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
            Einheit nicht gefunden
          </h3>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            Die Einheit mit ID "{einheitId}" konnte nicht gefunden werden.
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#92400e' }}>
            Alle Einheitsdaten werden live aus dem WEG-Einheiten-Store gelesen.
          </p>
        </div>
      </div>
    );
  }

  const handleAddNew = () => {
    onAddNew(einheitId);
  };

  return (
    <div className="card" style={{ marginBottom: '32px' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px'
        }}>
          {/* Linke Seite - Metadaten */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              alignItems: 'center'
            }}>
              {/* Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Auswählen</span>
              </div>

                             {/* Einheit */}
               <div>
                 <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                   Einheit
                 </label>
                 <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                   {einheitAnzeige}
                 </div>
               </div>

               {/* Mieter */}
               <div>
                 <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                   Mieter
                 </label>
                 <div style={{ fontSize: '16px', color: '#111827' }}>
                   {mieterAnzeige}
                 </div>
               </div>



              
            </div>
          </div>

          {/* Rechte Seite - Neuer Zähler Button */}
          <div>
            <button
              onClick={handleAddNew}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                padding: '10px 16px',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '16px' }}>➕</span>
              Neuer Zähler
            </button>
          </div>
        </div>
      </div>

      {/* Tabelle */}
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              backgroundColor: '#f9fafb', 
              borderBottom: '2px solid var(--border)',
              textAlign: 'left'
            }}>
              <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Zählernummer</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Bezeichnung</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Zählertyp</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Standort</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Notiz</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {sortedZaehler.map((z) => (
              <tr key={z.id} style={{ 
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'white'
              }}>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{z.zaehlernummer}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{z.bezeichnung}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{z.zaehlertyp}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{z.standort}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                  <input
                    type="text"
                    value={z.notiz}
                    onChange={(e) => onNotizChange(z.id, e.target.value)}
                    placeholder="Notiz eingeben..."
                    style={{
                      width: '100%',
                      border: '1px solid transparent',
                      background: 'transparent',
                      fontSize: '14px',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '1px solid var(--border)';
                      e.target.style.background = 'white';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid transparent';
                      e.target.style.background = 'transparent';
                    }}
                  />
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onEdit(z)}
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
                      onClick={() => onDelete(z.id)}
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leerer Zustand wenn keine Zähler vorhanden */}
      {sortedZaehler.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Keine Zähler für diese Einheit vorhanden
          </p>
        </div>
      )}
    </div>
  );
};

export default EinheitsZaehlerBlock;
