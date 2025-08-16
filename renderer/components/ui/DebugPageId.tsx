import React from 'react';

interface DebugPageIdProps {
  id: string;
  className?: string;
}

/**
 * Debug-Komponente für Page-ID-Anzeige
 * 
 * Zeigt eine rote Page-ID in einem roten Rahmen an
 * Sichtbar in Development-Modus oder wenn global aktiviert
 */
export function DebugPageId({ id, className = '' }: DebugPageIdProps) {
  // Robuster Modus-Check für Vite + globaler Toggle
  const mode = (globalThis as any).importMeta?.env?.MODE || 
               (globalThis as any).import?.meta?.env?.MODE || 
               (process.env.NODE_ENV ?? 'development');
  const enabled = (window as any).__DEBUG_PAGE_IDS__ === true || mode !== 'production';
  
  // Einmaliges Logging für Debugging
  React.useEffect(() => {
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[DebugPageId] mode=', mode, 'enabled=', enabled, 'id=', id);
    }
  }, [mode, enabled, id]);
  
  if (!enabled) {
    return null;
  }

  return (
    <span 
      data-testid="debug-page-id"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid #e00',
        color: '#e00',
        borderRadius: '4px',
        fontSize: '0.75rem',
        padding: '0 6px',
        marginLeft: '8px',
        lineHeight: '1.6',
        fontWeight: '500',
        backgroundColor: 'rgba(255, 0, 0, 0.05)'
      }}
      title={`Page-ID: ${id}`}
    >
      {id}
    </span>
  );
}

export default DebugPageId;
