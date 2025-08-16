// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Sichere Whitelist für IPC-Kanäle
const whitelistedChannels = [
  'db:query',
  'pdf:export', 
  'settings:get',
  'settings:set'
];

const whitelistedEvents = [
  'db:changed'
];

contextBridge.exposeInMainWorld('api', {
  // Sichere IPC-Bridge mit Whitelist
  invoke: (channel, ...args) => {
    if (!whitelistedChannels.includes(channel)) {
      throw new Error(`Blocked channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  
  on: (channel, callback) => {
    if (!whitelistedEvents.includes(channel)) {
      throw new Error(`Blocked event channel: ${channel}`);
    }
    ipcRenderer.on(channel, (_, data) => callback(data));
  },

  // --- vorhandene Funktionen (behalten) ---
  getDefaultPropertyId: () => ipcRenderer.invoke('db:query', 'get-property-id'),
  listMetersWithReadings: (propertyId) =>
    ipcRenderer.invoke('db:query', 'list-meters-with-readings', { propertyId }),
  exportAbleseprotokoll: (propertyId) =>
    ipcRenderer.invoke('pdf:export', 'ableseprotokoll', { propertyId }),

  // --- neue, allgemeine DB-Funktionen ---
  getOverview: () => ipcRenderer.invoke('db:query', 'get-overview'),
  listMeters: (propertyId) => ipcRenderer.invoke('db:query', 'list-meters', propertyId),
  saveReading: (data) => ipcRenderer.invoke('db:query', 'save-reading', data),
  getReadings: (args) => ipcRenderer.invoke('db:query', 'get-readings', args),

  // NEW:
  listUnits: (propertyId) => ipcRenderer.invoke('db:query', 'list-units', { propertyId }),
  listReadingsForMeter: (meterId, limit) => ipcRenderer.invoke('db:query', 'list-readings-for-meter', { meterId, limit }),

  // kleine Bequemlichkeits-Alias (optional)
  getPropertyId: () => ipcRenderer.invoke('db:query', 'get-property-id'),

  // --- Betriebskosten-Übersicht Funktionen ---
  bkListYears: (propertyId) => ipcRenderer.invoke('db:query', 'list-years', { propertyId }),
  bkStart: (propertyId, year) => ipcRenderer.invoke('db:query', 'start', { propertyId, year }),
  bkGetStatement: (id) => ipcRenderer.invoke('db:query', 'get-statement', { id }),
  bkUpdateStatus: (id, status) => ipcRenderer.invoke('db:query', 'update-status', { id, status }),
  
  // --- Heizkosten-Modul ---
  heatLoad: (statementId) => ipcRenderer.invoke('db:query', 'heat-load', { statementId }),
  heatSave: (payload) => ipcRenderer.invoke('db:query', 'heat-save', payload),
  heatCompute: (statementId) => ipcRenderer.invoke('db:query', 'heat-compute', { statementId }),
  
  // --- Betriebskosten: Kategorien & Belege ---
  bkListCategories: (propertyId, year) => ipcRenderer.invoke('db:query', 'list-categories', { propertyId, year }),
  bkUpdateCategoryKey: (categoryId, key) => ipcRenderer.invoke('db:query', 'update-category-key', { categoryId, key }),
  bkListVouchers: (propertyId, categoryId, year) => ipcRenderer.invoke('db:query', 'list-vouchers', { propertyId, categoryId, year }),
  bkSaveVoucher: (payload) => ipcRenderer.invoke('db:query', 'save-voucher', payload),
  bkDeleteVoucher: (id, propertyId) => ipcRenderer.invoke('db:query', 'delete-voucher', { id, propertyId }),
  bkToggleInclude: (id, include) => ipcRenderer.invoke('db:query', 'toggle-include', { id, include }),
  bkAttachFile: (voucherId, propertyId) => ipcRenderer.invoke('db:query', 'attach-file', { voucherId, propertyId }),
  bkOpenAttachment: (voucherId) => ipcRenderer.invoke('db:query', 'open-attachment', { voucherId }),
  
  // --- Betriebskosten: Verteilungslogik ---
  calcBasis: (propertyId, year, key) => ipcRenderer.invoke('db:query', 'calc-basis', { propertyId, year, key }),
  sumCategory: (propertyId, categoryId, year) => ipcRenderer.invoke('db:query', 'sum-category', { propertyId, categoryId, year }),
  previewDistribution: (statementId, propertyId, categoryId, year) => ipcRenderer.invoke('db:query', 'preview-distribution', { statementId, propertyId, categoryId, year }),
  setOverride: (statementId, categoryId, unitId, manual_amount_gross, note) => ipcRenderer.invoke('db:query', 'set-override', { statementId, categoryId, unitId, manual_amount_gross, note }),
  saveDistribution: (statementId, propertyId, categoryId, year) => ipcRenderer.invoke('db:query', 'save-distribution', { statementId, propertyId, categoryId, year }),
  
  // --- Statement-Übersicht & Export ---
  stmtOverview: (statementId) => ipcRenderer.invoke('db:query', 'overview', { statementId }),
  stmtExportPdf: (statementId) => ipcRenderer.invoke('pdf:export', 'statement', { statementId }),
  
  // --- Payments ---
  paymentsList: (propertyId, year, unitId=null) => ipcRenderer.invoke('db:query', 'payments-list', { propertyId, year, unitId }),
  paymentsSave: (payload) => ipcRenderer.invoke('db:query', 'payments-save', payload),
  paymentUpsert: (payload) => ipcRenderer.invoke('db:query', 'payments-upsert', payload),
  paymentDelete: (id) => ipcRenderer.invoke('db:query', 'payments-delete', { id }),
  
  // --- Statement → Vorauszahlungen ---
  stmtPrepayments: (statementId) => ipcRenderer.invoke('db:query', 'prepayments', { statementId }),
  
  // --- Advance Payments (monatliche Vorauszahlungen) ---
  advanceList: (propertyId, year) => ipcRenderer.invoke('db:query', 'advance-list', { propertyId, year }),
  advanceSave: (propertyId, unitId, year, month, amount) => ipcRenderer.invoke('db:query', 'advance-save', { propertyId, unitId, year, month, amount }),
  advanceImportCsv: (propertyId, year, csvData) => ipcRenderer.invoke('db:query', 'advance-import-csv', { propertyId, year, csvData }),
  
  // --- Heizkostenberechnung ---
  heatingCalculate: (propertyId, year) => ipcRenderer.invoke('db:query', 'heating-calculate', { propertyId, year }),
  heatingGetSettings: (propertyId) => ipcRenderer.invoke('db:query', 'heating-get-settings', { propertyId }),
  heatingSaveSettings: (propertyId, settings) => ipcRenderer.invoke('db:query', 'heating-save-settings', { propertyId, settings }),
  
  // --- Betriebskostenabrechnung ---
  statementCalculate: (propertyId, year) => ipcRenderer.invoke('db:query', 'statement-calculate', { propertyId, year }),
  statementGet: (propertyId, year) => ipcRenderer.invoke('db:query', 'statement-get', { propertyId, year }),
  statementSave: (propertyId, year, data) => ipcRenderer.invoke('db:query', 'statement-save', { propertyId, year, data }),
  statementExportPdf: (propertyId, year) => ipcRenderer.invoke('pdf:export', 'statement', { propertyId, year }),
  statementUpdateRow: (rowId, verteilschluessel, anteil, betrag) => ipcRenderer.invoke('db:query', 'statement-update-row', { rowId, verteilschluessel, anteil, betrag }),
  
  // --- Heizkostenabrechnung ---
  getHeizungsEinstellungen: (propertyId, year) => ipcRenderer.invoke('db:query', 'heizungs-einstellungen', propertyId, year),
  getHeizungsDaten: (propertyId, year) => ipcRenderer.invoke('db:query', 'heizungs-daten', propertyId, year),
  saveHeizkostenCalculation: (propertyId, year, results) => ipcRenderer.invoke('db:query', 'save-heizkosten-calculation', propertyId, year, results),
  
  // === NEW: Complete Statement Workflow ===
  statementCreateOrRecalc: (propertyId, year) => ipcRenderer.invoke('db:query', 'statement-create-or-recalc', { propertyId, year }),
  statementGetRun: (propertyId, year) => ipcRenderer.invoke('db:query', 'statement-get-run', { propertyId, year }),
  statementFinalize: (propertyId, year) => ipcRenderer.invoke('db:query', 'statement-finalize', { propertyId, year }),
});

contextBridge.exposeInMainWorld('db', {
  saveReading: (data) => ipcRenderer.invoke('db:query', 'save-reading', data),
  listReadings: (query) => ipcRenderer.invoke('db:query', 'list-readings', query),
  updateReading: (data) => ipcRenderer.invoke('db:query', 'update-reading', data),
  deleteReading: (data) => ipcRenderer.invoke('db:query', 'delete-reading', data),
});

contextBridge.exposeInMainWorld('units', {
  update: (id, patch) => ipcRenderer.invoke('db:query', 'units-update', { id, patch }),
});

contextBridge.exposeInMainWorld('immo', {
  list: () => ipcRenderer.invoke('db:query', 'immo-list'),
  get:  (id) => ipcRenderer.invoke('db:query', 'immo-get', { id }),
  update: (id, patch) => ipcRenderer.invoke('db:query', 'immo-update', { id, patch }),
});
