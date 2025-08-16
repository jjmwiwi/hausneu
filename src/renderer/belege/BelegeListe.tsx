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

const BelegeListe: React.FC = () => {
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

  const handleAddNew = async () => {
    try {
      await window.api.invoke("belege:openCreateWindow");
    } catch (error) {
      console.error('Fehler beim Öffnen des Popup-Fensters:', error);
    }
  };

  // Event-Listener für Beleg-Erstellung
  useEffect(() => {
    const handleBelegCreated = () => {
      load(); // Liste neu laden
    };

    window.api.on("belege:created", handleBelegCreated);

    return () => {
      // Cleanup: Event-Listener entfernen
      // Da wir kein off() haben, können wir den Listener nicht explizit entfernen
      // Das ist in diesem Fall akzeptabel, da die Komponente nur einmal gemountet wird
    };
  }, []);

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          data-testid="btn-new-beleg" 
          type="button" 
          onClick={handleAddNew}
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


    </div>
  );
};

export default BelegeListe;
