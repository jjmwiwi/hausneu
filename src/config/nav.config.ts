/**
 * Zentrale Navigationskonfiguration
 * Alle Navigationslabels und -pfade werden hier zentral verwaltet
 */

export const NAV = {
  // Hauptnavigation
  IMMOBILIEN: {
    label: 'Immobilien',
    path: '/immobilien',
    icon: '🏠'
  },
  
  // WEG-spezifische Navigation
  WEG: {
    STAMMDATEN: {
      label: 'WEG Stammdaten',
      path: '/stammdaten',
      icon: '📋'
    },
    EINHEITEN: {
      label: 'WEG-Einheiten',
      path: '/einheiten',
      icon: '🏢'
    },
    KOSTENARTEN: {
      label: 'Kostenarten',
      path: '/kostenarten',
      icon: '💰'
    },
    ZAEHLER: {
      label: 'Zählerstand',
      path: '/zaehler',
      icon: '📊',
      UEBERSICHT: {
        label: 'Zählerübersicht',
        path: '/uebersicht',
        icon: '📋'
      }
    },
    BUCHHALTUNG: {
      label: 'Buchhaltung',
      path: '/buchhaltung',
      icon: '💰'
    }
  },
  
  // Zählerstand-spezifische Navigation
  ZAEHLER: {
    ABLESUNGEN: {
      label: 'Ablesungen',
      path: '/zaehlerstaende/ablesungen',
      icon: '📊'
    }
  },
  
  // Weitere Navigation
  IMMOBILIE_NEU: {
    label: 'Immobilie neu anlegen',
    path: '/immobilie-neu',
    icon: '➕'
  }
} as const;

// Typen für TypeScript
export type NavKey = keyof typeof NAV;
export type NavItem = typeof NAV[NavKey];

// Hilfsfunktionen
export const getNavPath = (key: NavKey, subKey?: string): string => {
  const navItem = NAV[key];
  if (subKey && 'path' in navItem && typeof navItem === 'object') {
    const subItem = (navItem as any)[subKey];
    return subItem?.path || '';
  }
  return 'path' in navItem ? navItem.path : '';
};

export const getNavLabel = (key: NavKey, subKey?: string): string => {
  const navItem = NAV[key];
  if (subKey && 'label' in navItem && typeof navItem === 'object') {
    const subItem = (navItem as any)[subKey];
    return subItem?.label || '';
  }
  return 'label' in navItem ? navItem.label : '';
};

export const getNavIcon = (key: NavKey, subKey?: string): string => {
  const navItem = NAV[key];
  if (subKey && 'icon' in navItem && typeof navItem === 'object') {
    const subItem = (navItem as any)[subKey];
    return subItem?.icon || '';
  }
  return 'icon' in navItem ? navItem.icon : '';
};
