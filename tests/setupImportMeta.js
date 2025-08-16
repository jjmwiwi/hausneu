// Mock für import.meta.env (Vite-spezifisch)
global.import = {
  meta: {
    env: {
      MODE: 'test',
      DEV: true,
      PROD: false
    }
  }
};

// Mock für Vite-spezifische Globals
global.importMeta = {
  env: {
    MODE: 'test',
    DEV: true,
    PROD: false
  }
};
