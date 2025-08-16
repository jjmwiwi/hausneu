// Router for managing navigation state and route restoration
const ROUTES = {
  UNITS: 'units',
  ZAEHLERSTAENDE: 'zaehlerstaende',
  BUCHHALTUNG: 'buchhaltung',
  BETRIEBSKOSTEN: 'betriebskosten'
};

// Route definitions
const ROUTE_CONFIG = {
  [ROUTES.UNITS]: {
    path: '/',
    title: 'WEG Einheiten',
    handler: () => {
      // Already on units view
      return true;
    }
  },
  [ROUTES.ZAEHLERSTAENDE]: {
    path: '/zaehlerstaende',
    title: 'Zählerstand',
    handler: () => {
      window.location.href = './zaehlerstaende.html';
      return true;
    }
  },
  [ROUTES.BUCHHALTUNG]: {
    path: '/buchhaltung',
    title: 'Buchhaltung',
    handler: () => {
      alert('Buchhaltung wird in einer zukünftigen Version implementiert.');
      return false;
    }
  },
  [ROUTES.BETRIEBSKOSTEN]: {
    path: '/betriebskosten',
    title: 'Betriebskostenabrechnung',
    handler: () => {
      window.location.href = './betriebskosten.html';
      return true;
    }
  }
};

// Current route state
let currentRoute = '';

// Initialize router
function initRouter() {
  // Listen for hash changes
  window.addEventListener('hashchange', handleHashChange);
  
  // Handle initial route
  handleInitialRoute();
}

// Handle initial route on app startup
function handleInitialRoute() {
  if (location.hash) {
    handleHashChange();
  } else {
    // Try to restore last route
    const lastRoute = window.nav?.loadLastRoute();
    if (lastRoute) {
      location.hash = lastRoute;
    } else {
      // Default to first immobilie's units view
      const firstImmo = document.querySelector('[data-immo-id]');
      if (firstImmo) {
        navigateToRoute(`/immobilien/${firstImmo.dataset.immoId}/units`);
      }
    }
  }
  
  // Update navigation highlighting for initial route
  updateNavigationHighlight(location.hash.slice(1));
}

// Handle hash changes
function handleHashChange() {
  const hash = location.hash.slice(1); // Remove #
  const route = parseRoute(hash);
  
  if (route && route.route) {
    navigateToRoute(route.route, route.params);
  }
  
  // Update navigation highlighting
  updateNavigationHighlight(hash);
}

// Parse route from hash
function parseRoute(hash) {
  // Simple route parsing: /immobilien/{id}/{view}
  const match = hash.match(/^\/immobilien\/(\d+)\/(\w+)$/);
  if (match) {
    return {
      route: match[2],
      params: { immoId: match[1] }
    };
  }
  
  // Fallback: treat hash as direct route
  return {
    route: hash,
    params: {}
  };
}

// Navigate to a specific route
function navigateToRoute(route, params = {}) {
  const routeConfig = ROUTE_CONFIG[route];
  if (!routeConfig) {
    console.warn(`Unknown route: ${route}`);
    return false;
  }
  
  // Update hash
  if (params.immoId) {
    location.hash = `/immobilien/${params.immoId}/${route}`;
  } else {
    location.hash = route;
  }
  
  // Execute route handler
  const success = routeConfig.handler(params);
  
  if (success) {
    // Update navigation state
    updateNavigationState(route, params);
    
    // Save last route
    window.nav?.saveLastRoute(location.hash);
  }
  
  return success;
}

// Update navigation highlighting
function updateNavigationHighlight(hash) {
  // Remove aria-current from all nav links
  document.querySelectorAll('.nav-link[data-route]').forEach(link => {
    link.removeAttribute('aria-current');
  });
  
  // Set aria-current on matching route
  const activeLink = document.querySelector(`[data-route="${hash}"]`);
  if (activeLink) {
    activeLink.setAttribute('aria-current', 'page');
    
    // Ensure parent immo node is expanded
    const immoNode = activeLink.closest('[data-immo-id]');
    if (immoNode) {
      const immoId = immoNode.dataset.immoId;
      // Expand the immo node
      const li = document.querySelector(`#nav-immo-${immoId}`);
      if (li) {
        li.setAttribute('aria-expanded', 'true');
        const children = li.querySelector('.nav-sub');
        if (children) {
          children.classList.remove('collapsed');
        }
      }
    }
  }
  
  // Auto-open nav-immos if route is under /immobilien/
  if (hash.startsWith('/immobilien/')) {
    const navImmos = document.getElementById('nav-immos');
    const toggle = document.getElementById('nav-immobilien-toggle');
    if (navImmos && toggle && navImmos.classList.contains('hidden')) {
      navImmos.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    }
  }
}

// Update navigation state based on current route
function updateNavigationState(route, params) {
  if (!window.nav) return;
  
  // Set active route in navigation
  window.nav.setActiveRoute(route);
  
  // Ensure parent immo node is expanded if we have an immoId
  if (params.immoId) {
    window.nav.expandImmoNode(params.immoId);
  }
}

// Get current route
function getCurrentRoute() {
  return currentRoute;
}

// Export for testing
window._routerTest = {
  parseRoute,
  navigateToRoute,
  getCurrentRoute
};

// Export for other modules
window.router = {
  initRouter,
  navigateToRoute,
  getCurrentRoute,
  ROUTES
};
