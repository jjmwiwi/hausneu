import React, { useState } from 'react';

import { WEGEinheit } from '../contexts/ImmobilienContext';

interface WEGEinheitCardProps {
  einheit: WEGEinheit;
  onEdit: (einheit: WEGEinheit) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WEGEinheit>) => void;
}

const WEGEinheitCard: React.FC<WEGEinheitCardProps> = ({ einheit, onEdit, onDelete, onUpdate }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingMieter, setIsEditingMieter] = useState(false);
  const [editingMieterValue, setEditingMieterValue] = useState(einheit.mieter || '');

  const handleEdit = () => {
    setShowMenu(false);
    onEdit(einheit);
  };

  const handleDelete = () => {
    if (confirm(`Möchten Sie die Einheit "${einheit.titel} Nr. ${einheit.wohnungsnummer}" wirklich löschen?`)) {
      onDelete(einheit.id);
    }
    setShowMenu(false);
  };

  const handleMieterEdit = () => {
    setIsEditingMieter(true);
    setEditingMieterValue(einheit.mieter || '');
  };

  const handleMieterSave = () => {
    onUpdate(einheit.id, { mieter: editingMieterValue.trim() });
    setIsEditingMieter(false);
  };

  const handleMieterCancel = () => {
    setEditingMieterValue(einheit.mieter || '');
    setIsEditingMieter(false);
  };

  const handleMieterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleMieterSave();
    } else if (e.key === 'Escape') {
      handleMieterCancel();
    }
  };

  return (
    <div className="card" style={{ 
      position: 'relative',
      padding: '20px',
      marginBottom: '20px'
    }}>
      {/* 3-Punkte-Menü */}
      <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            color: '#6b7280'
          }}
        >
          ⋯
        </button>
        
        {showMenu && (
          <div style={{
            position: 'absolute',
            right: '0',
            top: '100%',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
            minWidth: '120px'
          }}>
            <button
              onClick={handleEdit}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6'
              }}
            >
              ✏️ Bearbeiten
            </button>
            <button
              onClick={handleDelete}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#dc2626'
              }}
            >
              🗑️ Löschen
            </button>
          </div>
        )}
      </div>

      {/* Titel */}
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '18px', 
        fontWeight: '600',
        color: '#111827'
      }}>
        Wohnung {einheit.titel}{' '}
        <span style={{ 
          color: '#2563eb', 
          fontWeight: '500'
        }}>
          Nr. {einheit.wohnungsnummer}
        </span>
      </h3>

      {/* Details Grid */}
      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>👤</span>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>Mieter:</span>
          {isEditingMieter ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="text"
                value={editingMieterValue}
                onChange={(e) => setEditingMieterValue(e.target.value)}
                onKeyDown={handleMieterKeyDown}
                onBlur={handleMieterSave}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  minWidth: '120px'
                }}
                autoFocus
              />
              <button
                onClick={handleMieterSave}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ✓
              </button>
              <button
                onClick={handleMieterCancel}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: '500' }}>{einheit.mieter || '—'}</span>
              <button
                onClick={handleMieterEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px 4px',
                  borderRadius: '2px'
                }}
                title="Bearbeiten"
              >
                ✏️
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📧</span>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>E-Mail:</span>
          <a 
            href={`mailto:${einheit.email}`}
            style={{ 
              color: '#3b82f6', 
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            {einheit.email || '—'}
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📱</span>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>Telefon:</span>
          <span style={{ fontWeight: '500' }}>{einheit.telefon || '—'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📐</span>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>Fläche:</span>
                          <span style={{ fontWeight: '500' }}>{einheit.wohnflaeche || '—'} m²</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>⚖️</span>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>MEA:</span>
          <span style={{ fontWeight: '500' }}>{einheit.miteigentumsAnteil || '—'}</span>
        </div>
      </div>
    </div>
  );
};

export default WEGEinheitCard;
