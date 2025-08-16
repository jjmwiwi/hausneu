import React, { useState, useEffect } from 'react';

interface Kostenart {
  id: number;
  name: string;
}

interface BelegErfassungModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const BelegErfassungModal: React.FC<BelegErfassungModalProps> = ({ 
  open, 
  onClose, 
  onSaved 
}) => {
  const [formData, setFormData] = useState({
    datum: new Date().toISOString().split('T')[0],
    betrag: '',
    kostenartId: '',
    verwendungszweck: '',
    belegnummer: '',
    notizen: ''
  });

  const [kostenarten, setKostenarten] = useState<Kostenart[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kostenarten beim Öffnen des Modals laden
  useEffect(() => {
    if (open) {
      loadKostenarten();
      // Formular zurücksetzen
      setFormData({
        datum: new Date().toISOString().split('T')[0],
        betrag: '',
        kostenartId: '',
        verwendungszweck: '',
        belegnummer: '',
        notizen: ''
      });
      setErrors({});
    }
  }, [open]);

  const loadKostenarten = async () => {
    try {
      const items = await (window as any).api.invoke("kostenarten:list");
      setKostenarten(items);
    } catch (error) {
      console.error('Fehler beim Laden der Kostenarten:', error);
      setErrors({ general: 'Fehler beim Laden der Kostenarten' });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Fehler für dieses Feld entfernen
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.datum) {
      newErrors.datum = 'Datum ist erforderlich';
    }

    if (!formData.betrag || Number(formData.betrag) <= 0) {
      newErrors.betrag = 'Betrag muss größer als 0 sein';
    }

    if (!formData.kostenartId) {
      newErrors.kostenartId = 'Kostenart ist erforderlich';
    }

    if (!formData.verwendungszweck.trim()) {
      newErrors.verwendungszweck = 'Verwendungszweck ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await (window as any).api.invoke("belege:create", {
        datum: formData.datum,
        betrag: Number(formData.betrag),
        kostenartId: Number(formData.kostenartId),
        verwendungszweck: formData.verwendungszweck.trim(),
        belegnummer: formData.belegnummer.trim() || null,
        notizen: formData.notizen.trim() || null
      });

      onSaved();
    } catch (error) {
      console.error('Fehler beim Speichern des Belegs:', error);
      setErrors({ 
        general: `Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div 
      className="modal-overlay"
      style={{
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
      }}
      onClick={onClose}
    >
      <div 
        className="modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Neuer Beleg
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Schließen"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {errors.general && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {errors.general}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Datum *
            </label>
            <input
              type="date"
              value={formData.datum}
              onChange={(e) => handleInputChange('datum', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.datum ? '1px solid #dc2626' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            {errors.datum && (
              <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                {errors.datum}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Betrag (EUR) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.betrag}
              onChange={(e) => handleInputChange('betrag', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.betrag ? '1px solid #dc2626' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            {errors.betrag && (
              <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                {errors.betrag}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Kostenart *
            </label>
            <select
              value={formData.kostenartId}
              onChange={(e) => handleInputChange('kostenartId', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.kostenartId ? '1px solid #dc2626' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Bitte wählen...</option>
              {kostenarten.map(kostenart => (
                <option key={kostenart.id} value={kostenart.id}>
                  {kostenart.name}
                </option>
              ))}
            </select>
            {errors.kostenartId && (
              <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                {errors.kostenartId}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Verwendungszweck *
            </label>
            <input
              type="text"
              value={formData.verwendungszweck}
              onChange={(e) => handleInputChange('verwendungszweck', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.verwendungszweck ? '1px solid #dc2626' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            {errors.verwendungszweck && (
              <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                {errors.verwendungszweck}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Belegnummer
            </label>
            <input
              type="text"
              value={formData.belegnummer}
              onChange={(e) => handleInputChange('belegnummer', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Notizen
            </label>
            <textarea
              value={formData.notizen}
              onChange={(e) => handleInputChange('notizen', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: isSubmitting ? '#9ca3af' : '#3b82f6',
                color: 'white',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isSubmitting ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BelegErfassungModal;
