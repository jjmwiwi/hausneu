import React, { useState, useEffect } from 'react';
import WEGEinheitCard from './WEGEinheitCard';
import WEGEinheitFormModal from './WEGEinheitFormModal';
import { useImmobilien, WEGEinheit } from '../contexts/ImmobilienContext';
import PageTitle from './ui/PageTitle';
import DebugPageId from './ui/DebugPageId';
import { PAGE_IDS } from '../../src/constants/pageIds';

const WEGEinheitenPage: React.FC = () => {
  const { wegEinheiten, updateWEGEinheit, repairWEGEinheitenData } = useImmobilien();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEinheit, setEditingEinheit] = useState<WEGEinheit | null>(null);

  const handleAddNew = () => {
    setEditingEinheit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (einheit: WEGEinheit) => {
    setEditingEinheit(einheit);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const updatedEinheiten = wegEinheiten.filter(e => e.id !== id);
    updateWEGEinheiten(updatedEinheiten);
  };

  const handleUpdate = (id: string, updates: Partial<WEGEinheit>) => {
    console.log('handleUpdate called:', { id, updates });
    updateWEGEinheit(id, updates);
  };

  const handleSave = (patch: Partial<WEGEinheit>) => {
    if (editingEinheit) {
      // Bestehende Einheit aktualisieren
      console.log('Updating existing unit:', editingEinheit.id, 'with patch:', patch);
      updateWEGEinheit(editingEinheit.id, patch);
    } else {
      // Neue Einheit erstellen
      const newEinheit: WEGEinheit = {
        id: `einheit-${Date.now()}`,
        ...patch
      };
      console.log('Creating new unit:', newEinheit);
      updateWEGEinheit(newEinheit.id, newEinheit);
    }
    
    // Modal schließen
    setIsModalOpen(false);
    setEditingEinheit(null);
  };

  const handleCloseModal = () => {
    console.log('Modal closing, resetting state');
    setIsModalOpen(false);
    setEditingEinheit(null);
  };

  return (
    <div className="p-6">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header mit Titel und Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <PageTitle 
            title="WEG-Einheiten" 
            extra={<DebugPageId id={PAGE_IDS.WEG_EINHEITEN} />}
          />
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={repairWEGEinheitenData}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                padding: '10px 16px',
                backgroundColor: '#f59e0b'
              }}
              title="Repariert fehlende MAE- und Flächenwerte"
            >
              <span style={{ fontSize: '16px' }}>🔧</span>
              Daten reparieren
            </button>
            
            <button
              onClick={handleAddNew}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                padding: '10px 16px'
              }}
            >
              <span style={{ fontSize: '16px' }}>➕</span>
              Neue Wohneinheit
            </button>
          </div>
        </div>

        {/* Einheiten Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '24px'
        }}>
          {wegEinheiten
            .sort((a, b) => a.wohnungsnummer - b.wohnungsnummer)
            .map(einheit => (
                             <WEGEinheitCard
                 key={einheit.id}
                 einheit={einheit}
                 onEdit={handleEdit}
                 onDelete={handleDelete}
                 onUpdate={handleUpdate}
               />
            ))}
        </div>

        {/* Leerer Zustand */}
        {wegEinheiten.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '500' }}>
              Keine WEG-Einheiten vorhanden
            </h3>
            <p style={{ margin: 0, fontSize: '16px' }}>
              Klicken Sie auf "Neue Wohneinheit" um die erste Einheit zu erstellen.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <WEGEinheitFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        einheit={editingEinheit}
      />
    </div>
  );
};

export default WEGEinheitenPage;
