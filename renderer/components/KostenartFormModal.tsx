import React, { useState, useEffect } from 'react';
import { Kostenart } from '../contexts/ImmobilienContext';

interface KostenartFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (kostenart: Kostenart) => void;
}

const KostenartFormModal: React.FC<KostenartFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState<Omit<Kostenart, 'id'>>({
    name: '',
    verteilschluesselId: 'MEA',
    aktiv: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Formular zurücksetzen wenn Modal geöffnet wird
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        verteilschluesselId: 'MEA',
        aktiv: true
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name der Kostenart ist erforderlich';
    }

    if (!formData.verteilschluesselId) {
      newErrors.verteilschluesselId = 'Verteilerschlüssel ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const kostenartToSave: Kostenart = {
        id: `new-${Date.now()}`, // Temporäre ID, wird in der Page ersetzt
        ...formData
      };
      
      onSave(kostenartToSave);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Fehler beim Tippen entfernen
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  const verteilschluesselOptions = [
    { value: 'MEA', label: 'Miteigentumsanteil' },
    { value: 'WOHNFLAECHE', label: 'Wohnfläche' },
    { value: 'VERBRAUCH_STROM', label: 'Strom' },
    { value: 'ANZAHL_WOHNUNGEN', label: 'Anzahl Wohnungen' },
    { value: 'INDIVIDUELL', label: 'Individuelle Zuweisung' },
    { value: 'VERBRAUCH_WAERME', label: 'Wärmeverbrauch' },
    { value: 'VERBRAUCH_WASSER', label: 'Wasserverbrauch' },
    { value: 'VERBRAUCH_WASSER', label: 'Gesamtwasserverbrauch' },
    { value: 'VERBRAUCH_WAERME', label: 'Wärmemenge Warmwasser' }
  ];

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
            Neue Kostenart
          </h2>
          <button
            onClick={onClose}
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
            {/* Name der Kostenart */}
            <div className="form-group">
              <label>
                Name der Kostenart *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="z.B. Grundsteuer"
                style={{ 
                  borderColor: errors.name ? '#dc2626' : undefined,
                  width: '100%'
                }}
              />
              {errors.name && (
                <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                  {errors.name}
                </div>
              )}
            </div>

            {/* Verteilerschlüssel */}
            <div className="form-group">
              <label>
                Verteilerschlüssel *
              </label>
              <select
                value={formData.verteilschluesselId}
                onChange={(e) => handleInputChange('verteilschluesselId', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  borderColor: errors.verteilschluesselId ? '#dc2626' : undefined
                }}
              >
                {verteilschluesselOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.verteilschluesselId && (
                <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                  {errors.verteilschluesselId}
                </div>
              )}
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
              onClick={onClose}
              className="btn"
              style={{ backgroundColor: '#6b7280' }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KostenartFormModal;






