import React, { useState, useEffect } from 'react';
import { Zaehler, ZaehlerTyp, ZAHLERTYP_EINHEIT } from '../../src/types/zaehler.types';

interface Zaehler {
  id: string;
  wegId: string;
  zaehlernummer: string;
  bezeichnung: string;
  zaehlertyp: ZaehlerTyp;
  zaehlertypEinheit: string | null;
  standort?: string;
  einheitId: string;
  notiz: string;
  startwert?: number | null;
  ablesewert?: number | null;
}

interface WEGEinheit {
  id: string;
  titel: string;
  wohnungsnummer: number;
}

interface ZaehlerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (zaehlerData: Omit<Zaehler, 'id'>) => void;
  editingZaehler: Omit<Zaehler, 'id'> | null;
  einheiten: WEGEinheit[];
  preselectedEinheitId?: string;
}

const ZaehlerFormModal: React.FC<ZaehlerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingZaehler,
  einheiten,
  preselectedEinheitId
}) => {
  const [formData, setFormData] = useState<Omit<Zaehler, 'id'>>({
    zaehlernummer: '',
    bezeichnung: '',
    zaehlertyp: '',
    standort: '',
    einheitId: '',
    notiz: ''
  });

  // Formular mit Bearbeitungsdaten oder Standardwerten initialisieren
  useEffect(() => {
    if (editingZaehler) {
      setFormData(editingZaehler);
    } else {
      setFormData({
        zaehlernummer: '',
        bezeichnung: '',
        zaehlertyp: '',
        standort: '',
        einheitId: preselectedEinheitId || '',
        notiz: ''
      });
    }
  }, [editingZaehler, preselectedEinheitId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleClose = () => {
    setFormData({
      zaehlernummer: '',
      bezeichnung: '',
      zaehlertyp: '',
      standort: '',
      einheitId: '',
      notiz: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            {editingZaehler ? 'Zähler bearbeiten' : 'Neuer Zähler'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="form-group">
              <label>Zählernummer *</label>
              <input
                type="text"
                value={formData.zaehlernummer}
                onChange={(e) => setFormData(prev => ({ ...prev, zaehlernummer: e.target.value }))}
                placeholder="z.B. 10000000"
                required
              />
            </div>

            <div className="form-group">
              <label>Bezeichnung *</label>
              <input
                type="text"
                value={formData.bezeichnung}
                onChange={(e) => setFormData(prev => ({ ...prev, bezeichnung: e.target.value }))}
                placeholder="z.B. Heizung"
                required
              />
            </div>

            <div className="form-group">
              <label>Zählertyp *</label>
              <select
                value={formData.zaehlertyp}
                onChange={(e) => setFormData(prev => ({ ...prev, zaehlertyp: e.target.value }))}
                required
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid var(--border)', 
                  borderRadius: '6px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Bitte wählen...</option>
                <option value="Strom (kWh)">Strom (kWh)</option>
                <option value="Wärmemenge Heizung (MWh)">Wärmemenge Heizung (MWh)</option>
                <option value="Kaltwasserverbrauch (m³)">Kaltwasserverbrauch (m³)</option>
                <option value="Warmwasserverbrauch (m³)">Warmwasserverbrauch (m³)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Standort *</label>
              <input
                type="text"
                value={formData.standort}
                onChange={(e) => setFormData(prev => ({ ...prev, standort: e.target.value }))}
                placeholder="z.B. Heizraum"
                required
              />
            </div>

            <div className="form-group">
              <label>Einheit *</label>
              <select
                value={formData.einheitId}
                onChange={(e) => setFormData(prev => ({ ...prev, einheitId: e.target.value }))}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                disabled={!!preselectedEinheitId} // Gesperrt wenn vorausgewählt
              >
                <option value="">Einheit auswählen</option>
                <option value="haus">Hauszähler</option>
                {einheiten.map(einheit => (
                  <option key={einheit.id} value={einheit.id}>
                    {einheit.titel} – Nr. {einheit.wohnungsnummer}
                  </option>
                ))}
              </select>
              {preselectedEinheitId && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Einheit ist für diesen Block vorausgewählt
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Notiz</label>
              <textarea
                value={formData.notiz}
                onChange={(e) => setFormData(prev => ({ ...prev, notiz: e.target.value }))}
                placeholder="Optionale Notiz..."
                style={{ minHeight: '80px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '24px',
            borderTop: '1px solid var(--border)',
            paddingTop: '24px'
          }}>
            <button
              type="button"
              onClick={handleClose}
              className="btn"
              style={{ backgroundColor: '#6b7280' }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {editingZaehler ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZaehlerFormModal;
