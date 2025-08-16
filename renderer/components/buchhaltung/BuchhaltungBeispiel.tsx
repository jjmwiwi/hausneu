import React, { useState } from 'react';
import {
  fmtDate,
  fmtRange,
  fmtEUR,
  round2,
  distributeRemainder,
  validateSum
} from '../../utils/buchhaltungUtils';

interface BelegPosition {
  id: string;
  beschreibung: string;
  betrag: number;
}

interface Beleg {
  id: string;
  datum: string;
  beschreibung: string;
  positionen: BelegPosition[];
  gesamtbetrag: number;
}

const BuchhaltungBeispiel: React.FC = () => {
  const [belege, setBelege] = useState<Beleg[]>([
    {
      id: '1',
      datum: '2024-01-15',
      beschreibung: 'Materialkosten Januar',
      positionen: [
        { id: '1', beschreibung: 'Farben', betrag: 33.333 },
        { id: '2', beschreibung: 'Werkzeuge', betrag: 33.333 },
        { id: '3', beschreibung: 'Verbrauchsmaterial', betrag: 33.333 }
      ],
      gesamtbetrag: 100.00
    }
  ]);

  const [neuerBeleg, setNeuerBeleg] = useState<Partial<Beleg>>({
    datum: new Date().toISOString().split('T')[0],
    beschreibung: '',
    positionen: [],
    gesamtbetrag: 0
  });

  // Berechne korrekte Summen mit Rest-Cent-Verteilung
  const berechneKorrekteSummen = (positionen: BelegPosition[], gesamtbetrag: number) => {
    const betraege = positionen.map(pos => pos.betrag);
    const korrekteBetraege = distributeRemainder(gesamtbetrag, betraege);
    
    return positionen.map((pos, index) => ({
      ...pos,
      betrag: korrekteBetraege[index]
    }));
  };

  // Validiere Beleg
  const istBelegKorrekt = (beleg: Beleg) => {
    const summe = beleg.positionen.reduce((acc, pos) => acc + pos.betrag, 0);
    return validateSum(beleg.gesamtbetrag, [summe]);
  };

  // Füge neue Position hinzu
  const addPosition = () => {
    if (!neuerBeleg.positionen) return;
    
    setNeuerBeleg(prev => ({
      ...prev,
      positionen: [
        ...(prev.positionen || []),
        {
          id: Date.now().toString(),
          beschreibung: '',
          betrag: 0
        }
      ]
    }));
  };

  // Aktualisiere Position
  const updatePosition = (index: number, field: keyof BelegPosition, value: string | number) => {
    if (!neuerBeleg.positionen) return;
    
    const neuePositionen = [...neuerBeleg.positionen];
    neuePositionen[index] = {
      ...neuePositionen[index],
      [field]: field === 'betrag' ? Number(value) : value
    };
    
    setNeuerBeleg(prev => ({
      ...prev,
      positionen: neuePositionen
    }));
  };

  // Erstelle neuen Beleg
  const createBeleg = () => {
    if (!neuerBeleg.datum || !neuerBeleg.beschreibung || !neuerBeleg.positionen?.length) {
      alert('Bitte füllen Sie alle Felder aus');
      return;
    }

    const gesamtbetrag = neuerBeleg.positionen.reduce((acc, pos) => acc + pos.betrag, 0);
    const korrektePositionen = berechneKorrekteSummen(neuerBeleg.positionen, gesamtbetrag);
    
    const neuerBelegVollstaendig: Beleg = {
      id: Date.now().toString(),
      datum: neuerBeleg.datum!,
      beschreibung: neuerBeleg.beschreibung!,
      positionen: korrektePositionen,
      gesamtbetrag: gesamtbetrag
    };

    setBelege(prev => [...prev, neuerBelegVollstaendig]);
    setNeuerBeleg({
      datum: new Date().toISOString().split('T')[0],
      beschreibung: '',
      positionen: [],
      gesamtbetrag: 0
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1>Buchhaltung mit Utils - Beispiel</h1>
      
      {/* Neuer Beleg */}
      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '24px',
        backgroundColor: '#f9fafb'
      }}>
        <h3>Neuer Beleg</h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Datum:</label>
          <input
            type="date"
            value={neuerBeleg.datum}
            onChange={(e) => setNeuerBeleg(prev => ({ ...prev, datum: e.target.value }))}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Beschreibung:</label>
          <input
            type="text"
            value={neuerBeleg.beschreibung}
            onChange={(e) => setNeuerBeleg(prev => ({ ...prev, beschreibung: e.target.value }))}
            placeholder="Belegbeschreibung"
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label>Positionen:</label>
            <button
              onClick={addPosition}
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
              + Position
            </button>
          </div>
          
          {neuerBeleg.positionen?.map((pos, index) => (
            <div key={pos.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={pos.beschreibung}
                onChange={(e) => updatePosition(index, 'beschreibung', e.target.value)}
                placeholder="Beschreibung"
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              />
              <input
                type="number"
                step="0.01"
                value={pos.betrag}
                onChange={(e) => updatePosition(index, 'betrag', e.target.value)}
                placeholder="0.00"
                style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={createBeleg}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Beleg erstellen
        </button>
      </div>

      {/* Bestehende Belege */}
      <div>
        <h3>Bestehende Belege</h3>
        
        {belege.map(beleg => (
          <div key={beleg.id} style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
            backgroundColor: '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0' }}>{beleg.beschreibung}</h4>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  {fmtDate(beleg.datum)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  {fmtEUR(beleg.gesamtbetrag)}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: istBelegKorrekt(beleg) ? '#10b981' : '#ef4444' 
                }}>
                  {istBelegKorrekt(beleg) ? '✓ Summe korrekt' : '⚠️ Summe inkorrekt'}
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px', fontWeight: '500' }}>Beschreibung</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: '500' }}>Betrag</th>
                </tr>
              </thead>
              <tbody>
                {beleg.positionen.map(pos => (
                  <tr key={pos.id}>
                    <td style={{ padding: '8px' }}>{pos.beschreibung}</td>
                    <td style={{ textAlign: 'right', padding: '8px' }}>
                      {fmtEUR(pos.betrag)}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '1px solid #e5e7eb', fontWeight: '600' }}>
                  <td style={{ padding: '8px' }}>Gesamt</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>
                    {fmtEUR(beleg.gesamtbetrag)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BuchhaltungBeispiel;
