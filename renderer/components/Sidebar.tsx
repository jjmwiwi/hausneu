import React, { useState, useEffect } from 'react';
import { NavLink, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useImmobilien } from '../contexts/ImmobilienContext';
import { NAV } from '../../src/config/nav.config';

const Sidebar: React.FC = () => {
  const [isImmobilienOpen, setIsImmobilienOpen] = useState(false);
  const { stammdaten } = useImmobilien();
  const { wegId = 'weg-stuttgarter-strasse' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Expandiere das Untermenü automatisch, wenn wir auf einer WEG-Route sind
  useEffect(() => {
    if (location.pathname.startsWith(`/immobilien/${wegId}`)) {
      setIsImmobilienOpen(true);
    }
  }, [location.pathname, wegId]);

  // Generiere das WEG-Label aus den Stammdaten
  const getWEGLabel = () => {
    if (stammdaten && stammdaten.name) {
      return stammdaten.name;
    }
    if (stammdaten && stammdaten.address) {
      return `WEG ${stammdaten.address}`;
    }
    return 'WEG (ohne Bezeichnung)';
  };

  const handleImmobilienClick = () => {
    navigate('/immobilien');
  };

  return (
    <aside className="sidebar">
      <div className="brand" onClick={handleImmobilienClick} style={{ cursor: 'pointer' }}>
        <i></i>
        <span className="brand-text">{NAV.IMMOBILIEN.label}</span>
      </div>

      <nav>
        <button
          onClick={() => setIsImmobilienOpen(!isImmobilienOpen)}
          className="nav-button"
          style={{
            justifyContent: 'space-between'
          }}
        >
          <span className="icon">{NAV.IMMOBILIEN.icon}</span>
          <span className="label">{NAV.IMMOBILIEN.label}</span>
          <span style={{ 
            transform: isImmobilienOpen ? 'rotate(90deg)' : 'none', 
            transition: 'transform 0.2s',
            fontSize: '10px'
          }}>
            ▶
          </span>
        </button>

        {isImmobilienOpen && (
          <div style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: 'var(--text-secondary)',
              padding: '8px 12px',
              backgroundColor: '#FBFBFD',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              {getWEGLabel()}
            </div>
            
            <ul className="nav-sub" style={{ backgroundColor: '#FBFBFD', color: '#000000' }}>
              <li className="nav-item">
                <NavLink
                  to={`/immobilien/${wegId}${NAV.WEG.STAMMDATEN.path}`}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  style={{ color: '#000000' }}
                >
                  <span className="icon">{NAV.WEG.STAMMDATEN.icon}</span>
                  <span className="label">{NAV.WEG.STAMMDATEN.label}</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to={`/immobilien/${wegId}${NAV.WEG.KOSTENARTEN.path}`}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  style={{ color: '#000000' }}
                >
                  <span className="icon">{NAV.WEG.KOSTENARTEN.icon}</span>
                  <span className="label">{NAV.WEG.KOSTENARTEN.label}</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to={`/immobilien/${wegId}${NAV.WEG.EINHEITEN.path}`}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  style={{ color: '#000000' }}
                >
                  <span className="icon">{NAV.WEG.EINHEITEN.icon}</span>
                  <span className="label">{NAV.WEG.EINHEITEN.label}</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to={`/immobilien/${wegId}${NAV.WEG.ZAEHLER.path}`}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  style={{ color: '#000000' }}
                  role="link"
                  aria-label={NAV.WEG.ZAEHLER.label}
                >
                  <span className="icon">{NAV.WEG.ZAEHLER.icon}</span>
                  <span className="label">{NAV.WEG.ZAEHLER.label}</span>
                </NavLink>
                <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <div className="nav-item">
                    <NavLink
                      to={`/immobilien/${wegId}${NAV.WEG.ZAEHLER.path}${NAV.WEG.ZAEHLER.UEBERSICHT.path}`}
                      className={({ isActive }) => 
                        `nav-link ${isActive ? 'active' : ''}`
                      }
                      style={{ color: '#000000', fontSize: '14px' }}
                    >
                      <span className="icon">{NAV.WEG.ZAEHLER.UEBERSICHT.icon}</span>
                      <span className="label">{NAV.WEG.ZAEHLER.UEBERSICHT.label}</span>
                    </NavLink>
                  </div>
                </div>
              </li>
              <li className="nav-item">
                <NavLink
                  to={`/immobilien/${wegId}${NAV.WEG.BUCHHALTUNG.path}`}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  style={{ color: '#000000' }}
                  data-testid="nav-buchhaltung"
                >
                  <span className="icon">{NAV.WEG.BUCHHALTUNG.icon}</span>
                  <span className="label">{NAV.WEG.BUCHHALTUNG.label}</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <a href="#" className="nav-link" style={{ color: '#000000' }}>
                  <span className="icon">{NAV.IMMOBILIE_NEU.icon}</span>
                  <span className="label">{NAV.IMMOBILIE_NEU.label}</span>
                </a>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
