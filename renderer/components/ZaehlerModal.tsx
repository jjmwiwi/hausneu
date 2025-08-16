import React, { useState, useEffect, useRef } from 'react';
import { Zaehler, ZaehlerTyp, ZAHLERTYP_LABEL } from '../../src/types/zaehler.types';
import zaehlerService from '../../src/services/zaehler.service';

interface ZaehlerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (zaehler: Zaehler) => void;
  zaehler?: Zaehler | null;
  einheiten: any[];
  currentEinheitId: string;
  wegId?: string;
}

const ZaehlerModal: React.FC<ZaehlerModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  zaehler, 
  einheiten, 
  currentEinheitId, 
  wegId 
}) => {
  const [formData, setFormData] = useState({
    einheitId: currentEinheitId,
    zaehlernummer: '',
    bezeichnung: '',
    zaehlertyp: ZaehlerTyp.STROM,
    standort: '',
    notiz: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Idempotency-Key für jeden Modal-Öffnungsvorgang
  const idemRef = useRef<string>(`idem-${Date.now()}-${Math.random()}`);

  const isEditMode = !!zaehler;

  useEffect(() => {
    if (isOpen) {
      // Generiere neuen Idempotency-Key bei jedem Öffnen
      idemRef.current = `idem-${Date.now()}-${Math.random()}`;
      
      if (zaehler) {
        // Edit mode
        setFormData({
          einheitId: zaehler.einheitId,
          zaehlernummer: zaehler.zaehlernummer,
          bezeichnung: zaehler.bezeichnung,
          zaehlertyp: zaehler.zaehlertyp,
          standort: zaehler.standort || '',
          notiz: zaehler.notiz || ''
        });
      } else {
        // Create mode
        setFormData({
          einheitId: currentEinheitId,
          zaehlernummer: '',
          bezeichnung: '',
          zaehlertyp: ZaehlerTyp.STROM,
          standort: '',
          notiz: ''
        });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, zaehler, currentEinheitId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.zaehlernummer.trim()) {
      newErrors.zaehlernummer = 'Zählernummer ist erforderlich';
    }
    if (!formData.bezeichnung.trim()) {
      newErrors.bezeichnung = 'Bezeichnung ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!validateForm()) {
      return;
    }

    // Verhindere doppelte Submits (auch gegen StrictMode/Enter)
    if (isSubmitting) {
      console.warn('[SUBMIT] Bereits in Bearbeitung, ignoriere Submit', { 
        timestamp: new Date().toISOString(),
        formData,
        idemKey: idemRef.current
      });
      return;
    }

    console.debug('[SUBMIT] Starte Submit', { 
      timestamp: new Date().toISOString(),
      isEditMode,
      formData,
      idemKey: idemRef.current
    });

    setIsSubmitting(true);

    try {
      let savedZaehler: Zaehler;

      if (isEditMode && zaehler) {
        // Update existing zaehler
        console.debug('[SUBMIT] updating zaehler', zaehler.id);
        savedZaehler = await zaehlerService.update(
          wegId || 'test-weg',
          zaehler.id,
          formData
        );
      } else {
        // Create new zaehler mit Idempotency-Key
        console.debug('[SUBMIT] creating new zaehler', formData);
        const createPayload = {
          ...formData,
          idemKey: idemRef.current
        } as any; // Temporärer Workaround für den Typ
        savedZaehler = await zaehlerService.create(
          wegId || 'test-weg',
          createPayload
        );
      }

      console.debug('[SUBMIT] response', savedZaehler);
      onSave(savedZaehler);
      onClose();
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error);
      // Zeige spezifische Fehlermeldung für Duplikate
      if (error.message?.includes('existiert bereits')) {
        setErrors({ submit: error.message });
      } else {
        setErrors({ submit: 'Fehler beim Speichern des Zählers' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | ZaehlerTyp) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  const handleClose = () => {
    // Verhindere Schließen während des Submits
    if (isSubmitting) {
      console.warn('[MODAL] Schließen während Submit verhindert');
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
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
      <div className="modal-content" style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
          {isEditMode ? 'Zähler bearbeiten' : 'Neuen Zähler anlegen'}
        </h2>

        <form onSubmit={onSubmit}>
          {/* Einheit */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Einheit *
            </label>
            <select
              value={formData.einheitId}
              onChange={(e) => handleInputChange('einheitId', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {einheiten.map(einheit => (
                <option key={einheit.id} value={einheit.id}>
                  {einheit.name}
                </option>
              ))}
            </select>
          </div>

          {/* Zählernummer */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Zählernummer *
            </label>
            <input
              type="text"
              value={formData.zaehlernummer}
              onChange={(e) => handleInputChange('zaehlernummer', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.zaehlernummer ? '1px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="z.B. A001, W001"
            />
            {errors.zaehlernummer && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.zaehlernummer}
              </div>
            )}
          </div>

          {/* Bezeichnung */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Bezeichnung *
            </label>
            <input
              type="text"
              value={formData.bezeichnung}
              onChange={(e) => handleInputChange('bezeichnung', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.bezeichnung ? '1px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="z.B. Hauptzähler, Wohnungszähler"
            />
            {errors.bezeichnung && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.bezeichnung}
              </div>
            )}
          </div>

          {/* Zählertyp */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Zählertyp *
            </label>
            <select
              value={formData.zaehlertyp}
              onChange={(e) => handleInputChange('zaehlertyp', e.target.value as ZaehlerTyp)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              aria-label="Zählertyp"
            >
              {Object.entries(ZAHLERTYP_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Standort */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Standort
            </label>
            <input
              type="text"
              value={formData.standort}
              onChange={(e) => handleInputChange('standort', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="z.B. Keller, Wohnung 1"
            />
          </div>

          {/* Notiz */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Notiz
            </label>
            <textarea
              value={formData.notiz}
              onChange={(e) => handleInputChange('notiz', e.target.value)}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="Optionale Notiz zum Zähler..."
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>
              {errors.submit}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Speichern...' : (isEditMode ? 'Aktualisieren' : 'Anlegen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZaehlerModal;
