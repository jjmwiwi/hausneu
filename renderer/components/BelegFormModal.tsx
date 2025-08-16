import React, { useState, useEffect } from 'react';
import { Beleg, Kostenart, WEGEinheit } from '../contexts/ImmobilienContext';
import { calculateNetto, validateBeleg, formatCurrency } from '../utils/belegUtils';

interface BelegFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (beleg: Omit<Beleg, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRecalculateUmlage?: (belegId: string) => Promise<void>; // Neue Funktion für Umlage-Berechnung
  beleg?: Beleg | null; // null = neuer Beleg, Beleg = bearbeiten
  kostenarten: Kostenart[];
  wegEinheiten: WEGEinheit[];
  selectedWegId: string;
}

const BelegFormModal: React.FC<BelegFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  beleg, 
  kostenarten,
  wegEinheiten,
  selectedWegId
}) => {
  const [formData, setFormData] = useState<Omit<Beleg, 'id' | 'createdAt' | 'updatedAt'>>({
    wegId: selectedWegId,
    datum: new Date().toISOString().split('T')[0], // Heute als Default
    belegname: '',
    betragBrutto: 0,
    mwstSatz: 19, // Standard MwSt
    netto: 0,
    steuerlicheKostenart: '',
    kostenartId: '',
    verteilschluesselId: '',
    jahr: new Date().getFullYear(),
    periodeVon: `${new Date().getFullYear()}-01-01`,
    periodeBis: `${new Date().getFullYear()}-12-31`,
    lohnkosten35aBrutto: 0,
    anhang: null,
    status: 'ENTWURF',
    abgerechnet: false,
    umlageSnapshot: undefined,
    umlageQuelle: 'auto'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formular mit Daten befüllen - nur beim Öffnen
  useEffect(() => {
    if (isOpen) {
      if (beleg) {
        // Bearbeiten - bestehende Daten laden
        setFormData({
          wegId: beleg.wegId,
          datum: beleg.datum,
          belegname: beleg.belegname,
          betragBrutto: beleg.betragBrutto,
          mwstSatz: beleg.mwstSatz,
          netto: beleg.netto,
          steuerlicheKostenart: beleg.steuerlicheKostenart || '',
          kostenartId: beleg.kostenartId,
          verteilschluesselId: beleg.verteilschluesselId,
          jahr: beleg.jahr,
          periodeVon: beleg.periodeVon,
          periodeBis: beleg.periodeBis,
          lohnkosten35aBrutto: beleg.lohnkosten35aBrutto || 0,
          anhang: beleg.anhang,
          status: beleg.status,
          abgerechnet: beleg.abgerechnet,
          umlageSnapshot: beleg.umlageSnapshot,
          umlageQuelle: beleg.umlageQuelle
        });
      } else {
        // Neue Einheit - Standardwerte
        const currentYear = new Date().getFullYear();
        setFormData({
          wegId: selectedWegId,
          datum: new Date().toISOString().split('T')[0],
          belegname: '',
          betragBrutto: 0,
          mwstSatz: 19,
          netto: 0,
          steuerlicheKostenart: '',
          kostenartId: '',
          verteilschluesselId: '',
          jahr: currentYear,
          periodeVon: `${currentYear}-01-01`,
          periodeBis: `${currentYear}-12-31`,
          lohnkosten35aBrutto: 0,
          anhang: null,
          status: 'ENTWURF',
          abgerechnet: false,
          umlageSnapshot: undefined,
          umlageQuelle: 'auto'
        });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, beleg?.id, selectedWegId]);

  // Netto automatisch berechnen wenn sich Brutto oder MwSt ändert
  useEffect(() => {
    if (formData.betragBrutto > 0 && formData.mwstSatz >= 0) {
      const netto = calculateNetto(formData.betragBrutto, formData.mwstSatz);
      setFormData(prev => ({ ...prev, netto }));
    }
  }, [formData.betragBrutto, formData.mwstSatz]);

  // Verteilerschlüssel automatisch setzen wenn sich Kostenart ändert
  useEffect(() => {
    if (formData.kostenartId) {
      const kostenart = kostenarten.find(k => k.id === formData.kostenartId);
      if (kostenart) {
        setFormData(prev => ({ 
          ...prev, 
          verteilschluesselId: kostenart.verteilschluesselId 
        }));
      }
    }
  }, [formData.kostenartId, kostenarten]);

  // Zeitraum automatisch setzen wenn sich Jahr ändert
  useEffect(() => {
    if (formData.jahr) {
      setFormData(prev => ({
        ...prev,
        periodeVon: `${formData.jahr}-01-01`,
        periodeBis: `${formData.jahr}-12-31`
      }));
    }
  }, [formData.jahr]);

  // Default-Kostenart setzen wenn Modal geöffnet wird
  useEffect(() => {
    if (isOpen && !beleg && kostenarten.length > 0) {
      // Setze erste aktive Kostenart als Default
      const firstActiveKostenart = kostenarten.find(k => k.aktiv);
      if (firstActiveKostenart) {
        setFormData(prev => ({
          ...prev,
          kostenartId: firstActiveKostenart.id,
          verteilschluesselId: firstActiveKostenart.verteilschluesselId
        }));
      }
    }
  }, [isOpen, beleg, kostenarten]);

  const validateForm = (): { isValid: boolean; missingFields: string[] } => {
    const newErrors: Record<string, string> = {};
    const missingFields: string[] = [];

    // Pflichtfelder prüfen
    if (!formData.belegname.trim()) {
      newErrors.belegname = 'Belegname ist erforderlich';
      missingFields.push('Belegname');
    }

    if (!formData.datum) {
      newErrors.datum = 'Datum ist erforderlich';
      missingFields.push('Datum');
    }

    if (formData.betragBrutto <= 0) {
      newErrors.betragBrutto = 'Gültiger Belegbetrag ist erforderlich';
      missingFields.push('Belegbetrag');
    }

    if (formData.mwstSatz < 0 || formData.mwstSatz > 100) {
      newErrors.mwstSatz = 'MwSt-Satz muss zwischen 0 und 100 liegen';
      missingFields.push('MwSt-Satz');
    }

    if (!formData.kostenartId) {
      newErrors.kostenartId = 'Kostenart ist erforderlich';
      missingFields.push('Kostenart');
    }

    if (!formData.verteilschluesselId) {
      newErrors.verteilschluesselId = 'Verteilerschlüssel ist erforderlich';
      missingFields.push('Verteilerschlüssel');
    }

    if (!formData.jahr || formData.jahr < 1900 || formData.jahr > 2100) {
      newErrors.jahr = 'Gültiges Abrechnungsjahr ist erforderlich';
      missingFields.push('Abrechnungsjahr');
    }

    // §35a Lohnkosten dürfen nicht höher als Bruttobetrag sein
    if (formData.lohnkosten35aBrutto && formData.lohnkosten35aBrutto > formData.betragBrutto) {
      newErrors.lohnkosten35aBrutto = 'Lohnkosten dürfen nicht höher als der Bruttobetrag sein';
      missingFields.push('Lohnkosten');
    }

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, missingFields };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (!validation.isValid) {
      console.warn('Formular-Validierung fehlgeschlagen:', validation.missingFields);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Formular-Daten für Speicherung vorbereiten
      const belegToSave = {
        ...formData,
        netto: formData.netto || calculateNetto(formData.betragBrutto, formData.mwstSatz)
      };

      await onSave(belegToSave);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern des Belegs:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Fehler beim Tippen entfernen
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getVerteilschluesselLabel = (schluessel: string): string => {
    const labels: Record<string, string> = {
      'MEA': 'Miteigentumsanteil',
      'WOHNFLAECHE': 'Wohnfläche',
      'VERBRAUCH_STROM': 'Strom',
      'ANZAHL_WOHNUNGEN': 'Anzahl Wohnungen',
      'INDIVIDUELL': 'Individuelle Zuweisung',
      'VERBRAUCH_WAERME': 'Wärmeverbrauch',
      'VERBRAUCH_WASSER': 'Wasserverbrauch'
    };
    return labels[schluessel] || schluessel;
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
        maxWidth: '600px',
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
            {beleg ? 'Beleg bearbeiten' : 'Neuer Beleg'}
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
            {/* Erste Zeile: Datum und Belegname */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              {/* Datum */}
              <div className="form-group">
                <label>
                  Datum *
                </label>
                <input
                  type="date"
                  value={formData.datum}
                  onChange={(e) => handleInputChange('datum', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    borderColor: errors.datum ? '#dc2626' : undefined
                  }}
                />
                {errors.datum && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    {errors.datum}
                  </div>
                )}
              </div>

              {/* Belegname */}
              <div className="form-group">
                <label>
                  Belegname *
                </label>
                <input
                  type="text"
                  value={formData.belegname}
                  onChange={(e) => handleInputChange('belegname', e.target.value)}
                  placeholder="z.B. Rechnung Grundsteuer 2024"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    borderColor: errors.belegname ? '#dc2626' : undefined
                  }}
                />
                {errors.belegname && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    {errors.belegname}
                  </div>
                )}
              </div>
            </div>

            {/* Zweite Zeile: Belegbetrag und MwSt */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Belegbetrag */}
              <div className="form-group">
                <label>
                  Belegbetrag (brutto) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.betragBrutto || ''}
                  onChange={(e) => handleInputChange('betragBrutto', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    borderColor: errors.betragBrutto ? '#dc2626' : undefined,
                    color: formData.betragBrutto < 0 ? '#dc2626' : formData.betragBrutto > 0 ? '#059669' : undefined
                  }}
                />
                {errors.betragBrutto && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    {errors.betragBrutto}
                  </div>
                )}
              </div>

              {/* MwSt-Satz */}
              <div className="form-group">
                <label>
                  MwSt-Satz *
                </label>
                <select
                  value={formData.mwstSatz}
                  onChange={(e) => handleInputChange('mwstSatz', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    borderColor: errors.mwstSatz ? '#dc2626' : undefined
                  }}
                >
                  <option value={0}>0%</option>
                  <option value={7}>7%</option>
                  <option value={19}>19%</option>
                  <option value={-1}>Custom</option>
                </select>
                {formData.mwstSatz === -1 && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Custom MwSt %"
                    onChange={(e) => handleInputChange('mwstSatz', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  />
                )}
                {errors.mwstSatz && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    {errors.mwstSatz}
                  </div>
                )}
              </div>
            </div>

            {/* Dritte Zeile: Netto (read-only) */}
            <div className="form-group">
              <label>
                Netto (berechnet)
              </label>
              <input
                type="text"
                value={formatCurrency(formData.netto)}
                readOnly
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280'
                }}
              />
            </div>

            {/* Vierte Zeile: Steuerliche Kostenart und Kostenart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Steuerliche Kostenart */}
              <div className="form-group">
                <label>
                  Steuerliche Kostenart (optional)
                </label>
                <input
                  type="text"
                  value={formData.steuerlicheKostenart}
                  onChange={(e) => handleInputChange('steuerlicheKostenart', e.target.value)}
                  placeholder="z.B. Grundsteuer"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px'
                  }}
                />
              </div>

              {/* Kostenart */}
              <div className="form-group">
                <label>
                  Kostenart *
                </label>
                <select
                  value={formData.kostenartId}
                  onChange={(e) => handleInputChange('kostenartId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    borderColor: errors.kostenartId ? '#dc2626' : undefined
                  }}
                >
                  <option value="">Bitte wählen...</option>
                  {kostenarten
                    .filter(k => k.aktiv)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(kostenart => (
                      <option key={kostenart.id} value={kostenart.id}>
                        {kostenart.name}
                      </option>
                    ))
                  }
                </select>
                {errors.kostenartId && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    {errors.kostenartId}
                  </div>
                )}
              </div>
            </div>

            {/* Fünfte Zeile: Verteilerschlüssel (read-only) */}
            {formData.verteilschluesselId && (
              <div className="form-group">
                <label>
                  Verteilerschlüssel
                </label>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  {getVerteilschluesselLabel(formData.verteilschluesselId)}
                </div>
              </div>
            )}

            {/* Sechste Zeile: Lohnkosten und Abrechnungsjahr */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Lohnkosten §35a */}
              <div className="form-group">
                <label>
                  Lohnkosten (§35a) brutto (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.betragBrutto}
                  value={formData.lohnkosten35aBrutto || ''}
                  onChange={(e) => handleInputChange('lohnkosten35aBrutto', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    borderColor: errors.lohnkosten35aBrutto ? '#dc2626' : undefined
                  }}
                />
                {errors.lohnkosten35aBrutto && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    {errors.lohnkosten35aBrutto}
                  </div>
                )}
              </div>

              {/* Abrechnungsjahr */}
              <div className="form-group">
                <label>
                  Abrechnungsjahr *
                </label>
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={formData.jahr || ''}
                  onChange={(e) => handleInputChange('jahr', parseInt(e.target.value) || new Date().getFullYear())}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    borderColor: errors.jahr ? '#dc2626' : undefined
                  }}
                />
                {errors.jahr && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    {errors.jahr}
                  </div>
                )}
              </div>
            </div>

            {/* Siebte Zeile: Zeitraum (read-only) */}
            <div className="form-group">
              <label>
                Zeitraum (automatisch gesetzt)
              </label>
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: '#374151',
                fontSize: '14px'
              }}>
                {formData.periodeVon} bis {formData.periodeBis}
              </div>
            </div>

            {/* Achte Zeile: Status */}
            <div className="form-group">
              <label>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as 'ENTWURF' | 'GEBUCHT')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px'
                }}
              >
                <option value="ENTWURF">Entwurf</option>
                <option value="GEBUCHT">Gebucht</option>
              </select>
            </div>

            {/* Neunte Zeile: Abgerechnet (read-only) */}
            <div className="form-group">
              <label>
                Abgerechnet
              </label>
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: '#374151',
                fontSize: '14px'
              }}>
                {formData.abgerechnet ? 'Ja' : 'Nein'}
              </div>
            </div>

            {/* Zehnte Zeile: Umlage-Status und Neu berechnen Button */}
            {beleg && beleg.umlageSnapshot && (
              <div className="form-group">
                <label>
                  Umlage-Status
                </label>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Quelle:</strong> {beleg.umlageQuelle === 'auto' ? 'Automatisch' : 'Manuell'}
                  </div>
                  {beleg.umlageSnapshot.hinweise && beleg.umlageSnapshot.hinweise.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Hinweise:</strong>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {beleg.umlageSnapshot.hinweise.map((hinweis, index) => (
                          <li key={index} style={{ fontSize: '12px' }}>{hinweis}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {onRecalculateUmlage && beleg && (
                    <button
                      type="button"
                      onClick={() => onRecalculateUmlage(beleg.id)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Neu berechnen
                    </button>
                  )}
                </div>
              </div>
            )}
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
              disabled={isSubmitting}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Speichere...' : (beleg ? 'Aktualisieren' : 'Speichern')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BelegFormModal;
