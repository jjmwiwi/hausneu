import React from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';

const BuchhaltungLayout: React.FC = () => {
  const location = useLocation();
  
  // Extrahiere die aktuelle Route für den aktiven Tab
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath.includes(path);
  
  // Behalte Query-Parameter beim Tab-Wechsel
  const createTabLink = (path: string) => {
    const query = location.search;
    return `${path}${query}`;
  };

  return (
    <div data-testid="route-buchhaltung">
      {/* Sticky Subnavigation */}
      <div style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        padding: '0 24px'
      }}>
        <div style={{
          display: 'flex',
          gap: '0',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <NavLink
            to={createTabLink('belege')}
            data-testid="tab-belege"
            style={({ isActive }) => ({
              padding: '16px 24px',
              textDecoration: 'none',
              color: isActive ? '#1f2937' : '#6b7280',
              borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              fontWeight: isActive ? '600' : '500',
              backgroundColor: isActive ? '#f8fafc' : 'transparent',
              transition: 'all 0.2s ease'
            })}
          >
            Belege
          </NavLink>
          
          <NavLink
            to={createTabLink('umlage/nach-einheiten')}
            data-testid="tab-umlage-einheiten"
            style={({ isActive }) => ({
              padding: '16px 24px',
              textDecoration: 'none',
              color: isActive ? '#1f2937' : '#6b7280',
              borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              fontWeight: isActive ? '600' : '500',
              backgroundColor: isActive ? '#f8fafc' : 'transparent',
              transition: 'all 0.2s ease'
            })}
          >
            Umlage nach Einheiten
          </NavLink>
          
          <NavLink
            to={createTabLink('bankimport')}
            data-testid="tab-bankimport"
            style={({ isActive }) => ({
              padding: '16px 24px',
              textDecoration: 'none',
              color: isActive ? '#1f2937' : '#6b7280',
              borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              fontWeight: isActive ? '600' : '500',
              backgroundColor: isActive ? '#f8fafc' : 'transparent',
              transition: 'all 0.2s ease'
            })}
          >
            Bankimport
          </NavLink>
        </div>
      </div>

      {/* Content-Bereich */}
      <div style={{ padding: '24px' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default BuchhaltungLayout;
