// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // --- vorhandene Funktionen (behalten) ---
  getDefaultPropertyId: () => ipcRenderer.invoke('db:get-property-id'),
  listMetersWithReadings: (propertyId) =>
    ipcRenderer.invoke('db:list-meters-with-readings', { propertyId }),
  exportAbleseprotokoll: (propertyId) =>
    ipcRenderer.invoke('export:ableseprotokoll', { propertyId }),

  // --- neue, allgemeine DB-Funktionen ---
  getOverview: () => ipcRenderer.invoke('db:get-overview'),
  listMeters: (propertyId) => ipcRenderer.invoke('db:list-meters', propertyId),
  saveReading: (data) => ipcRenderer.invoke('db:save-reading', data),
  getReadings: (args) => ipcRenderer.invoke('db:get-readings', args),

  // NEW:
  listUnits: (propertyId) => ipcRenderer.invoke('db:list-units', { propertyId }),
  listReadingsForMeter: (meterId, limit) => ipcRenderer.invoke('db:list-readings-for-meter', { meterId, limit }),

  // kleine Bequemlichkeits-Alias (optional)
  getPropertyId: () => ipcRenderer.invoke('db:get-property-id'),

  // --- Betriebskosten-Übersicht Funktionen ---
  bkListYears: (propertyId) => ipcRenderer.invoke('bk:list-years', { propertyId }),
  bkStart: (propertyId, year) => ipcRenderer.invoke('bk:start', { propertyId, year }),
  bkGetStatement: (id) => ipcRenderer.invoke('bk:get-statement', { id }),
  bkUpdateStatus: (id, status) => ipcRenderer.invoke('bk:update-status', { id, status }),
  
  // --- Heizkosten-Modul ---
  heatLoad: (statementId) => ipcRenderer.invoke('heat:load', { statementId }),
  heatSave: (payload) => ipcRenderer.invoke('heat:save', payload),
  heatCompute: (statementId) => ipcRenderer.invoke('heat:compute', { statementId }),
  
  // --- Betriebskosten: Kategorien & Belege ---
  bkListCategories: (propertyId, year) => ipcRenderer.invoke('bk:list-categories', { propertyId, year }),
  bkUpdateCategoryKey: (categoryId, key) => ipcRenderer.invoke('bk:update-category-key', { categoryId, key }),
  bkListVouchers: (propertyId, categoryId, year) => ipcRenderer.invoke('bk:list-vouchers', { propertyId, categoryId, year }),
  bkSaveVoucher: (payload) => ipcRenderer.invoke('bk:save-voucher', payload),
  bkDeleteVoucher: (id, propertyId) => ipcRenderer.invoke('bk:delete-voucher', { id, propertyId }),
  bkToggleInclude: (id, include) => ipcRenderer.invoke('bk:toggle-include', { id, include }),
  bkAttachFile: (voucherId, propertyId) => ipcRenderer.invoke('bk:attach-file', { voucherId, propertyId }),
  bkOpenAttachment: (voucherId) => ipcRenderer.invoke('bk:open-attachment', { voucherId }),
  
  // --- Betriebskosten: Verteilungslogik ---
  calcBasis: (propertyId, year, key) => ipcRenderer.invoke('bk:calc-basis', { propertyId, year, key }),
  sumCategory: (propertyId, categoryId, year) => ipcRenderer.invoke('bk:sum-category', { propertyId, categoryId, year }),
  previewDistribution: (statementId, propertyId, categoryId, year) => ipcRenderer.invoke('bk:preview-distribution', { statementId, propertyId, categoryId, year }),
  setOverride: (statementId, categoryId, unitId, manual_amount_gross, note) => ipcRenderer.invoke('bk:set-override', { statementId, categoryId, unitId, manual_amount_gross, note }),
  saveDistribution: (statementId, propertyId, categoryId, year) => ipcRenderer.invoke('bk:save-distribution', { statementId, propertyId, categoryId, year }),
  
  // --- Statement-Übersicht & Export ---
  stmtOverview: (statementId) => ipcRenderer.invoke('stmt:overview', { statementId }),
  stmtExportPdf: (statementId) => ipcRenderer.invoke('stmt:export-pdf', { statementId }),
  
  // --- Payments ---
  paymentsList: (propertyId, year, unitId=null) => ipcRenderer.invoke('payments:list', { propertyId, year, unitId }),
  paymentsSave: (payload) => ipcRenderer.invoke('payments:save', payload),
  paymentUpsert: (payload) => ipcRenderer.invoke('payments:upsert', payload),
  paymentDelete: (id) => ipcRenderer.invoke('payments:delete', { id }),
  
  // --- Statement → Vorauszahlungen ---
  stmtPrepayments: (statementId) => ipcRenderer.invoke('stmt:prepayments', { statementId }),
  
  // --- Advance Payments (monatliche Vorauszahlungen) ---
  advanceList: (propertyId, year) => ipcRenderer.invoke('advance:list', { propertyId, year }),
  advanceSave: (propertyId, unitId, year, month, amount) => ipcRenderer.invoke('advance:save', { propertyId, unitId, year, month, amount }),
  advanceImportCsv: (propertyId, year, csvData) => ipcRenderer.invoke('advance:import-csv', { propertyId, year, csvData }),
  
  // --- Heizkostenberechnung ---
  heatingCalculate: (propertyId, year) => ipcRenderer.invoke('heating:calculate', { propertyId, year }),
  heatingGetSettings: (propertyId) => ipcRenderer.invoke('heating:get-settings', { propertyId }),
  heatingSaveSettings: (propertyId, settings) => ipcRenderer.invoke('heating:save-settings', { propertyId, settings }),
  
  // --- Betriebskostenabrechnung ---
  statementCalculate: (propertyId, year) => ipcRenderer.invoke('statement:calculate', { propertyId, year }),
  statementGet: (propertyId, year) => ipcRenderer.invoke('statement:get', { propertyId, year }),
  statementSave: (propertyId, year, data) => ipcRenderer.invoke('statement:save', { propertyId, year, data }),
  statementExportPdf: (propertyId, year) => ipcRenderer.invoke('statement:export-pdf', { propertyId, year }),
  statementUpdateRow: (rowId, verteilschluessel, anteil, betrag) => ipcRenderer.invoke('statement:update-row', { rowId, verteilschluessel, anteil, betrag }),
  
  // --- Heizkostenabrechnung ---
  getHeizungsEinstellungen: (propertyId, year) => ipcRenderer.invoke('getHeizungsEinstellungen', propertyId, year),
  getHeizungsDaten: (propertyId, year) => ipcRenderer.invoke('getHeizungsDaten', propertyId, year),
  saveHeizkostenCalculation: (propertyId, year, results) => ipcRenderer.invoke('saveHeizkostenCalculation', propertyId, year, results),
  
  // === NEW: Complete Statement Workflow ===
  statementCreateOrRecalc: (propertyId, year) => ipcRenderer.invoke('statement:create-or-recalc', { propertyId, year }),
  statementGetRun: (propertyId, year) => ipcRenderer.invoke('statement:get-run', { propertyId, year }),
  statementFinalize: (propertyId, year) => ipcRenderer.invoke('statement:finalize', { propertyId, year }),
});

contextBridge.exposeInMainWorld('db', {
  saveReading: (data) => ipcRenderer.invoke('db:save-reading', data),
  listReadings: (query) => ipcRenderer.invoke('db:list-readings', query),
  updateReading: (data) => ipcRenderer.invoke('db:update-reading', data),
  deleteReading: (data) => ipcRenderer.invoke('db:delete-reading', data),
});

contextBridge.exposeInMainWorld('units', {
  update: (id, patch) => ipcRenderer.invoke('units:update', { id, patch }),
});

                contextBridge.exposeInMainWorld('immo', {
                  list: () => ipcRenderer.invoke('immo:list'),
                  get:  (id) => ipcRenderer.invoke('immo:get', { id }),
                  update: (id, patch) => ipcRenderer.invoke('immo:update', { id, patch }),
                });
