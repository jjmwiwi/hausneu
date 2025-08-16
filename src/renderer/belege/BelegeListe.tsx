import React, { useState, useEffect } from 'react';
import BelegErfassungModal from './BelegErfassungModal';

// Typ-Deklaration für window.api
declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

const BelegeListe: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [belege, setBelege] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      setIsLoading(true);
      const items = await window.api.invoke("belege:list");
      setBelege(items || []);
    } catch (error) {
      console.error('Fehler beim Laden der Belege:', error);
      setBelege([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          data-testid="btn-new-beleg" 
          type="button" 
          onClick={() => setOpen(true)}
        >
          + neuer Beleg
        </button>
      </div>

      {/* Belege-Liste hier anzeigen */}
      <div>
        {isLoading ? (
          <p>Lade Belege...</p>
        ) : belege && belege.length === 0 ? (
          <p>Keine Belege vorhanden</p>
        ) : (
          <p>{belege.length} Belege geladen</p>
        )}
      </div>

      {open && (
        <BelegErfassungModal 
          open={open} 
          onClose={() => setOpen(false)} 
          onSaved={() => {
            setOpen(false);
            load();
          }} 
        />
      )}
    </div>
  );
};

export default BelegeListe;
