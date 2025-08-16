import React, { useState, useEffect, useRef } from 'react';
import { useImmobilien } from '../contexts/ImmobilienContext';
// PAGE_IDS nicht mehr benötigt, da DebugPageId entfernt wurde
// DebugPageId entfernt - Debug-Fenster wird nicht mehr angezeigt
import PageTitle from './ui/PageTitle';
import DebugPageId from './ui/DebugPageId';
import { PAGE_IDS } from '../../src/constants/pageIds';

const StammdatenPage: React.FC = () => {
  const { stammdaten, updateStammdaten } = useImmobilien();
  const [localStammdaten, setLocalStammdaten] = useState(stammdaten);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialisiere lokalen State nur beim ersten Laden
  useEffect(() => {
    if (!isInitialized && stammdaten) {
      setLocalStammdaten(stammdaten);
      setIsInitialized(true);
    }
  }, [stammdaten, isInitialized]);

  const handleSave = () => {
    console.log('Saving stammdaten:', localStammdaten);
    
    // Aktualisiere nur den globalen State - keine doppelten Updates
    updateStammdaten(localStammdaten);
    
    alert('Stammdaten gespeichert!');
  };

  const handleDelete = () => {
    if (confirm('Möchten Sie wirklich alle Stammdaten löschen?')) {
      const emptyStammdaten = {
        name: '',
        address: '',
        city: '',
        zip: '',
        notes: '',
        image: '',
        heizungsdaten: {
          heizungsart: 'Zentral mit Warmwasser',
          brennstoff: 'Heizleistung (kWh)',
          beheizteWohnflaeche: 0,
          vorlauftemperatur: 60,
          einheitWarmwasser: 'Wärmemenge Warmwasser (MWh)',
          keinVerbrauch: false,
          verbrauchsAnteil: 70
        }
      };
      setLocalStammdaten(emptyStammdaten);
      updateStammdaten(emptyStammdaten);
      alert('Stammdaten gelöscht!');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const updatedStammdaten = { ...localStammdaten, image: result };
        setLocalStammdaten(updatedStammdaten);
        // Sofort in den globalen State speichern für Persistierung
        updateStammdaten(updatedStammdaten);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    const updatedStammdaten = { ...localStammdaten, image: '' };
    setLocalStammdaten(updatedStammdaten);
    // Sofort in den globalen State speichern für Persistierung
    updateStammdaten(updatedStammdaten);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Debug-Informationen
  console.log('StammdatenPage render:', { 
    stammdaten, 
    localStammdaten, 
    isLoading, 
    isInitialized 
  });

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Lade Stammdaten...</div>
      </div>
    );
  }

  if (!stammdaten) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Keine Stammdaten verfügbar</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <PageTitle 
            title="Stammdaten" 
            extra={<DebugPageId id={PAGE_IDS.STAMMDATEN} />}
          />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
            <div>
              <div className="form-group">
                <label>
                  Name der Immobilie
                </label>
                <input
                  type="text"
                  value={localStammdaten.name}
                  onChange={(e) => setLocalStammdaten({...localStammdaten, name: e.target.value})}
                  placeholder="z.B. WEG Stuttgarter Strasse 104"
                />
              </div>

              <div className="form-group">
                <label>
                  Straße & Hausnummer
                </label>
                <input
                  type="text"
                  value={localStammdaten.address}
                  onChange={(e) => setLocalStammdaten({...localStammdaten, address: e.target.value})}
                  placeholder="z.B. Stuttgarter Strasse 104"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-group">
                  <label>
                    Stadt
                  </label>
                  <input
                    type="text"
                    value={localStammdaten.city}
                    onChange={(e) => setLocalStammdaten({...localStammdaten, city: e.target.value})}
                    placeholder="z.B. Leonberg"
                  />
                </div>
                <div className="form-group">
                  <label>
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={localStammdaten.zip}
                    onChange={(e) => setLocalStammdaten({...localStammdaten, zip: e.target.value})}
                    placeholder="z.B. 71229"
                    style={{ minWidth: '120px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  Notizen
                </label>
                <textarea
                  value={localStammdaten.notes}
                  onChange={(e) => setLocalStammdaten({...localStammdaten, notes: e.target.value})}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Zusätzliche Informationen zur Immobilie..."
                />
              </div>

              {/* Heizungsabschnitt */}
              <div style={{ marginTop: '32px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: '20px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--border)'
                }}>
                  Heizung
                </h3>
                
                <div style={{ display: 'grid', gap: '20px' }}>
                  {/* Heizungsart und Brennstoff in einer Zeile */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label>
                        Heizungsart *
                      </label>
                      <select
                        value={localStammdaten.heizungsdaten.heizungsart}
                        onChange={(e) => setLocalStammdaten({
                          ...localStammdaten,
                          heizungsdaten: {
                            ...localStammdaten.heizungsdaten,
                            heizungsart: e.target.value
                          }
                        })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                      >
                        <option value="Zentral mit Warmwasser">Zentral mit Warmwasser</option>
                        <option value="Zentral ohne Warmwasser">Zentral ohne Warmwasser</option>
                        <option value="Etagenheizung">Etagenheizung</option>
                        <option value="Sonstige">Sonstige</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        Brennstoff / Einheitenbasis *
                      </label>
                      <select
                        value={localStammdaten.heizungsdaten.brennstoff}
                        onChange={(e) => setLocalStammdaten({
                          ...localStammdaten,
                          heizungsdaten: {
                            ...localStammdaten.heizungsdaten,
                            brennstoff: e.target.value
                          }
                        })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                      >
                        <option value="Heizleistung (kWh)">Heizleistung (kWh)</option>
                        <option value="Gas (kWh)">Gas (kWh)</option>
                        <option value="Öl (kWh)">Öl (kWh)</option>
                        <option value="Fernwärme (kWh)">Fernwärme (kWh)</option>
                      </select>
                    </div>
                  </div>

                  {/* Beheizte Wohnfläche und Vorlauftemperatur in einer Zeile */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label>
                        Beheizte Wohnfläche (m²) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={localStammdaten.heizungsdaten.beheizteWohnflaeche}
                        onChange={(e) => setLocalStammdaten({
                          ...localStammdaten,
                          heizungsdaten: {
                            ...localStammdaten.heizungsdaten,
                            beheizteWohnflaeche: parseFloat(e.target.value) || 0
                          }
                        })}
                        placeholder="z.B. 473.22"
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Vorlauftemperatur (°C) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="20"
                        max="90"
                        value={localStammdaten.heizungsdaten.vorlauftemperatur}
                        onChange={(e) => setLocalStammdaten({
                          ...localStammdaten,
                          heizungsdaten: {
                            ...localStammdaten.heizungsdaten,
                            vorlauftemperatur: parseInt(e.target.value) || 0
                          }
                        })}
                        placeholder="z.B. 60"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Einheit Warmwasser */}
                  <div className="form-group">
                    <label>
                      Einheit Warmwasserboiler / Messbasis *
                    </label>
                    <select
                      value={localStammdaten.heizungsdaten.einheitWarmwasser}
                      onChange={(e) => setLocalStammdaten({
                        ...localStammdaten,
                        heizungsdaten: {
                          ...localStammdaten.heizungsdaten,
                          einheitWarmwasser: e.target.value
                        }
                      })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                    >
                      <option value="Wärmemenge Warmwasser (MWh)">Wärmemenge Warmwasser (MWh)</option>
                      <option value="Warmwasserverbrauch (m³)">Warmwasserverbrauch (m³)</option>
                    </select>
                  </div>

                  {/* Kein Verbrauch verfügbar Checkbox */}
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={localStammdaten.heizungsdaten.keinVerbrauch}
                        onChange={(e) => setLocalStammdaten({
                          ...localStammdaten,
                          heizungsdaten: {
                            ...localStammdaten.heizungsdaten,
                            keinVerbrauch: e.target.checked
                          }
                        })}
                        style={{ width: '16px', height: '16px' }}
                      />
                      Kein Verbrauch verfügbar
                    </label>
                  </div>

                  {/* Verbrauchsabhängiger Kostenanteil */}
                  <div className="form-group">
                    <label>
                      Verbrauchsabhängiger Kostenanteil *
                    </label>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                        {[70, 50, 0].map((prozent) => (
                          <label key={prozent} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="verbrauchsAnteil"
                              value={prozent}
                              checked={localStammdaten.heizungsdaten.verbrauchsAnteil === prozent}
                              onChange={(e) => setLocalStammdaten({
                                ...localStammdaten,
                                heizungsdaten: {
                                  ...localStammdaten.heizungsdaten,
                                  verbrauchsAnteil: parseInt(e.target.value)
                                }
                              })}
                              disabled={localStammdaten.heizungsdaten.keinVerbrauch}
                              style={{ width: '16px', height: '16px' }}
                            />
                            {prozent}%
                          </label>
                        ))}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="verbrauchsAnteil"
                            value="anpassen"
                            checked={localStammdaten.heizungsdaten.verbrauchsAnteil !== 70 && 
                                    localStammdaten.heizungsdaten.verbrauchsAnteil !== 50 && 
                                    localStammdaten.heizungsdaten.verbrauchsAnteil !== 0}
                            onChange={() => setLocalStammdaten({
                              ...localStammdaten,
                              heizungsdaten: {
                                ...localStammdaten.heizungsdaten,
                                verbrauchsAnteil: 0
                              }
                            })}
                            disabled={localStammdaten.heizungsdaten.keinVerbrauch}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Anpassen
                        </label>
                      </div>
                      
                      {/* Individueller Prozentsatz bei "Anpassen" */}
                      {(localStammdaten.heizungsdaten.verbrauchsAnteil !== 70 && 
                        localStammdaten.heizungsdaten.verbrauchsAnteil !== 50 && 
                        localStammdaten.heizungsdaten.verbrauchsAnteil !== 0) && (
                        <div style={{ marginTop: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={localStammdaten.heizungsdaten.verbrauchsAnteil}
                            onChange={(e) => setLocalStammdaten({
                              ...localStammdaten,
                              heizungsdaten: {
                                ...localStammdaten.heizungsdaten,
                                verbrauchsAnteil: parseInt(e.target.value) || 0
                              }
                            })}
                            placeholder="Prozentsatz eingeben"
                            disabled={localStammdaten.heizungsdaten.keinVerbrauch}
                            style={{ width: '100%', maxWidth: '200px' }}
                          />
                          <span style={{ marginLeft: '8px', color: '#6b7280' }}>%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bild-Upload Bereich */}
            <div style={{ 
              border: '2px dashed #d1d5db', 
              borderRadius: '8px', 
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#f9fafb',
              minHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer'
            }} onClick={handleImageClick}>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />

              {localStammdaten.image ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  <img 
                    src={localStammdaten.image} 
                    alt="Immobilienbild"  
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px', 
                      borderRadius: '6px',
                      objectFit: 'cover'
                    }} 
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(); }}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                    Klicken Sie hier, um ein Bild hochzuladen
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    JPG, PNG oder GIF bis 5MB
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            borderTop: '1px solid var(--border)',
            paddingTop: '24px'
          }}>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger"
            >
              Löschen
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StammdatenPage;
