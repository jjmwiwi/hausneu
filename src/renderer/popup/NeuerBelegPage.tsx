import React, { useState, useEffect } from 'react';

// Typ-Deklaration für window.api
declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (data: any) => void) => void;
    };
  }
}

interface Kostenart {
  id: number;
  name: string;
}

const NeuerBelegPage: React.FC = () => {
  const [kostenarten, setKostenarten] = useState<Kostenart[]>([]);
  const [formData, setFormData] = useState({
    datum: '',
    betrag: '',
    kostenartId: '',
    verwendungszweck: '',
    belegnummer: '',
    notizen: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadKostenarten();
  }, []);

  const loadKostenarten = async () => {
    try {
      const items = await window.api.invoke("kostenarten:list");
      setKostenarten(items || []);
    } catch (error) {
      console.error('Fehler beim Laden der Kostenarten:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Fehler beim Eingeben löschen
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

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        datum: formData.datum,
        betrag: Number(formData.betrag),
        kostenartId: Number(formData.kostenartId),
        verwendungszweck: formData.verwendungszweck.trim(),
        belegnummer: formData.belegnummer.trim() || null,
        notizen: formData.notizen.trim() || null
      };

      await window.api.invoke("belege:create", payload);
      
      // Popup schließen
      await window.api.invoke("window:closeSelf");
    } catch (error) {
      console.error('Fehler beim Speichern des Belegs:', error);
      alert('Fehler beim Speichern des Belegs');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    window.close();
  };

  return (
    <div data-testid="modal-beleg-erfassung" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Neuer Beleg</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <label>
          Datum *
          <input
            data-testid="input-datum"
            type="date"
            value={formData.datum}
            onChange={(e) => handleInputChange('datum', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        {errors.datum && <div style={{ color: 'red', fontSize: '0.875rem' }}>{errors.datum}</div>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Betrag *
          <input
            data-testid="input-betrag"
            type="number"
            step="0.01"
            min="0"
            value={formData.betrag}
            onChange={(e) => handleInputChange('betrag', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        {errors.betrag && <div style={{ color: 'red', fontSize: '0.875rem' }}>{errors.betrag}</div>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Kostenart *
          <select
            data-testid="select-kostenart"
            value={formData.kostenartId}
            onChange={(e) => handleInputChange('kostenartId', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          >
            <option value="">Bitte wählen...</option>
            {kostenarten.map(kostenart => (
              <option key={kostenart.id} value={kostenart.id}>
                {kostenart.name}
              </option>
            ))}
          </select>
        </label>
        {errors.kostenartId && <div style={{ color: 'red', fontSize: '0.875rem' }}>{errors.kostenartId}</div>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Verwendungszweck *
          <input
            data-testid="input-verwendungszweck"
            type="text"
            value={formData.verwendungszweck}
            onChange={(e) => handleInputChange('verwendungszweck', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        {errors.verwendungszweck && <div style={{ color: 'red', fontSize: '0.875rem' }}>{errors.verwendungszweck}</div>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Belegnummer
          <input
            type="text"
            value={formData.belegnummer}
            onChange={(e) => handleInputChange('belegnummer', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Notizen
          <textarea
            value={formData.notizen}
            onChange={(e) => handleInputChange('notizen', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', minHeight: '80px' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button
          data-testid="btn-abbrechen"
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          style={{ padding: '0.5rem 1rem' }}
        >
          Abbrechen
        </button>
        <button
          data-testid="btn-speichern"
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {isSubmitting ? 'Speichere...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
};

export default NeuerBelegPage;
