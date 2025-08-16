import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useImmobilien } from '../contexts/ImmobilienContext';

export default function RouteDebug() {
  const loc = useLocation();
  const params = useParams();
  const ctx = (() => { try { return useImmobilien(); } catch { return null; } })();
  const data = {
    pathname: loc.pathname, 
    search: loc.search, 
    hash: loc.hash,
    params, 
    selectedWegId: ctx?.selectedWegId,
    einheiten: ctx?.wegEinheiten?.length,
    stammdaten: ctx?.stammdaten?.name,
    kostenarten: ctx?.kostenarten?.length,
    loading: ctx?.isLoading, 
    error: String(ctx?.error ?? ''),
    NODE_ENV: process.env.NODE_ENV,
    APP_VERSION: (window as any).APP_VERSION,
    timestamp: new Date().toLocaleTimeString(),
  };
  return (
    <pre style={{
      position:'fixed',
      bottom:8,
      right:8,
      zIndex:99999,
      background:'#000',
      color:'#0f0',
      padding:'8px',
      fontSize:11,
      opacity:0.9,
      maxWidth:480,
      overflow:'auto'
    }}>
      {JSON.stringify(data,null,2)}
    </pre>
  );
}
