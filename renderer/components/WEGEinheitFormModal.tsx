import React, { useState, useEffect } from 'react';
import { WEGEinheit } from '../contexts/ImmobilienContext';
import { parseDeNumber } from '../utils/numberUtils';

interface WEGEinheitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (einheit: WEGEinheit) => void;
  einheit?: WEGEinheit | null; // null = neue Einheit, WEGEinheit = bearbeiten
}

const WEGEinheitFormModal: React.FC<WEGEinheitFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  einheit 
}) => {
  const [formData, setFormData] = useState<Omit<WEGEinheit, 'id'>>({
    titel: '',
    wohnungsnummer: 0,
    mieter: '',
    email: '',
    telefon: '',
    wohnflaeche: 0,
    miteigentumsAnteil: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Formular mit Daten befüllen - nur beim Öffnen
  useEffect(() => {
    if (isOpen) {
      if (einheit) {
        // Bearbeiten - bestehende Daten laden
        setFormData({
          titel: einheit.titel || '',
          wohnungsnummer: einheit.wohnungsnummer || 0,
          mieter: einheit.mieter || '',
          email: einheit.email || '',
          telefon: einheit.telefon || '',
          wohnflaeche: einheit.wohnflaeche || 0,
          miteigentumsAnteil: einheit.miteigentumsAnteil || 0
        });
      } else {
        // Neue Einheit - Standardwerte
        setFormData({
          titel: '',
          wohnungsnummer: 0,
          mieter: '',
          email: '',
          telefon: '',
          wohnflaeche: 0,
          miteigentumsAnteil: 0
        });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, einheit?.id]); // Nur bei isOpen oder wenn sich die Einheit-ID ändert

  const validateForm = (): { isValid: boolean; missingFields: string[] } => {
    const newErrors: Record<string, string> = {};
    const missingFields: string[] = [];

    // Titel ist immer erforderlich
    if (!formData.titel.trim()) {
      newErrors.titel = 'Titel ist erforderlich';
      missingFields.push('Titel/Bezeichnung');
    }

    // Wohnungsnummer ist immer erforderlich
    if (formData.wohnungsnummer <= 0) {
      newErrors.wohnungsnummer = 'Wohnungsnummer muss größer als 0 sein';
      missingFields.push('Wohnungsnummer');
    }

    // Mieter ist immer erforderlich
    if (!formData.mieter.trim()) {
      newErrors.mieter = 'Mietername ist erforderlich';
      missingFields.push('Mietername');
    }

    // E-Mail validieren nur wenn eingegeben
    if (formData.email.trim()) {
      if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
        newErrors.email = 'Ungültige E-Mail-Adresse';
      }
    }

    // Telefon validieren nur wenn eingegeben
    if (formData.telefon.trim()) {
      // Telefon ist gültig wenn nicht leer
    }

    // Fläche und MEA sind immer optional
    if (formData.wohnflaeche < 0) {
      newErrors.wohnflaeche = 'Fläche darf nicht negativ sein';
    }

    if (formData.miteigentumsAnteil < 0) {
      newErrors.miteigentumsAnteil = 'Miteigentumsanteil darf nicht negativ sein';
    }

    setErrors(newErrors);
    
    return {
      isValid: Object.keys(newErrors).length === 0,
      missingFields
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Verhindere Doppelklicks
    
    const validation = validateForm();
    
    if (validation.isValid) {
      // Alle Pflichtfelder sind ausgefüllt - direkt speichern
      await saveData();
    } else {
      // Pflichtfelder fehlen - Warnung anzeigen
      setShowWarning(true);
      setErrors(prev => ({ ...prev, general: 'Bitte alle mit * markierten Pflichtfelder ausfüllen' }));
    }
  };

  const saveData = async () => {
    setIsSubmitting(true);
    
    try {
      // Erstelle Patch nur mit den tatsächlich eingegebenen Werten
      const patch: Partial<WEGEinheit> = {
        titel: formData.titel.trim(),
        wohnungsnummer: Number(formData.wohnungsnummer),
        mieter: formData.mieter.trim()
      };

      // E-Mail nur hinzufügen wenn eingegeben
      if (formData.email.trim()) {
        patch.email = formData.email.trim();
      }

      // Telefon nur hinzufügen wenn eingegeben
      if (formData.telefon.trim()) {
        patch.telefon = formData.telefon.trim();
      }

      // Fläche nur hinzufügen wenn eingegeben
      if (formData.wohnflaeche && formData.wohnflaeche > 0) {
        const parsedFlaeche = parseDeNumber(formData.wohnflaeche);
        if (!isNaN(parsedFlaeche)) {
          patch.wohnflaeche = parsedFlaeche;
        } else {
          setErrors(prev => ({ ...prev, wohnflaeche: 'Ungültige Fläche' }));
          setIsSubmitting(false);
          return;
        }
      }

      // MEA nur hinzufügen wenn eingegeben
      if (formData.miteigentumsAnteil && formData.miteigentumsAnteil > 0) {
        const parsedMEA = Number(formData.miteigentumsAnteil);
        if (!isNaN(parsedMEA)) {
          patch.miteigentumsAnteil = parsedMEA;
        } else {
          setErrors(prev => ({ ...prev, miteigentumsAnteil: 'Ungültiger Miteigentumsanteil' }));
          setIsSubmitting(false);
          return;
        }
      }

      console.log('Submitting patch:', patch);
      onSave(patch);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setIsSubmitting(false);
    }
  };

  const handleForceSave = async () => {
    // Benutzer bestätigt - trotz fehlender Pflichtfelder speichern
    setShowWarning(false);
    await saveData();
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Fehler beim Tippen entfernen
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
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
            {einheit ? 'WEG-Einheit bearbeiten' : 'Neue WEG-Einheit'}
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
          {/* Allgemeine Fehlermeldung */}
          {errors.general && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#92400e',
              fontSize: '14px'
            }}>
              ⚠️ {errors.general}
            </div>
          )}
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Titel */}
            <div className="form-group">
              <label>
                Titel/Bezeichnung *
              </label>
              <input
                type="text"
                value={formData.titel}
                onChange={(e) => handleInputChange('titel', e.target.value)}
                placeholder="z.B. Klee oben"
                style={{ borderColor: errors.titel ? '#dc2626' : undefined }}
              />
              {errors.titel && (
                <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                  {errors.titel}
                </div>
              )}
            </div>

            {/* Wohnungsnummer */}
            <div className="form-group">
              <label>
                Wohnungsnummer *
              </label>
              <input
                type="number"
                min="1"
                value={formData.wohnungsnummer}
                onChange={(e) => handleInputChange('wohnungsnummer', parseInt(e.target.value) || 0)}
                placeholder="z.B. 4"
                style={{ borderColor: errors.wohnungsnummer ? '#dc2626' : undefined }}
              />
              {errors.wohnungsnummer && (
                <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                  {errors.wohnungsnummer}
                </div>
              )}
            </div>

            {/* Mieter Name */}
            <div className="form-group">
              <label>
                Mietername *
              </label>
              <input
                type="text"
                value={formData.mieter}
                onChange={(e) => handleInputChange('mieter', e.target.value)}
                placeholder="z.B. Rudolf Klee"
                style={{ borderColor: errors.mieter ? '#dc2626' : undefined }}
              />
              {errors.mieter && (
                <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                  {errors.mieter}
                </div>
              )}
            </div>

            {/* E-Mail */}
            <div className="form-group">
              <label>
                E-Mail-Adresse {!einheit && '*'}
              </label>
                              <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="z.B. email@example.de"
                  style={{ borderColor: errors.email ? '#dc2626' : undefined }}
                />
              {errors.email && (
                <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                  {errors.email}
                </div>
              )}
            </div>

            {/* Telefon */}
            <div className="form-group">
              <label>
                Telefonnummer {!einheit && '*'}
              </label>
                              <input
                  type="tel"
                  value={formData.telefon || ''}
                  onChange={(e) => handleInputChange('telefon', e.target.value)}
                  placeholder="z.B. 01718327771"
                  style={{ borderColor: errors.telefon ? '#dc2626' : undefined }}
                />
              {errors.telefon && (
                <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                  {errors.telefon}
                </div>
              )}
            </div>

            {/* Fläche und MEA in einer Zeile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>
                  Fläche (m²)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.wohnflaeche || ''}
                  onChange={(e) => handleInputChange('wohnflaeche', parseFloat(e.target.value) || 0)}
                  placeholder="z.B. 137.45"
                  style={{ borderColor: errors.wohnflaeche ? '#dc2626' : undefined }}
                />
                {errors.wohnflaeche && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    {errors.wohnflaeche}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>
                  Miteigentumsanteil
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.miteigentumsAnteil || ''}
                  onChange={(e) => handleInputChange('miteigentumsAnteil', parseInt(e.target.value) || 0)}
                  placeholder="z.B. 175"
                  style={{ borderColor: errors.miteigentumsAnteil ? '#dc2626' : undefined }}
                />
                {errors.miteigentumsAnteil && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    {errors.miteigentumsAnteil}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warnung bei fehlenden Pflichtfeldern */}
          {showWarning && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '16px',
              marginTop: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: '#dc2626',
                fontWeight: '600'
              }}>
                ⚠️ Pflichtfelder fehlen
              </div>
              <p style={{
                margin: '0 0 12px 0',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                Bitte alle mit * markierten Pflichtfelder ausfüllen, bevor Sie speichern.
              </p>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  type="button"
                  onClick={handleForceSave}
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{
                    fontSize: '14px',
                    padding: '8px 16px'
                  }}
                >
                  Trotzdem speichern
                </button>
                <button
                  type="button"
                  onClick={() => setShowWarning(false)}
                  className="btn"
                  style={{
                    fontSize: '14px',
                    padding: '8px 16px',
                    backgroundColor: '#6b7280'
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

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
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? 'Speichere...' : (einheit ? 'Aktualisieren' : 'Erstellen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WEGEinheitFormModal;
