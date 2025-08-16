const { contextBridge } = require('electron');
jest.resetModules();

test('preload exposes db/csv/units APIs', () => {
  require('../preload.js'); // adjust path
  expect(contextBridge._exposed.db).toBeTruthy();
  expect(typeof contextBridge._exposed.db.listReadings).toBe('function');
  expect(typeof contextBridge._exposed.db.saveReading).toBe('function');
  expect(typeof contextBridge._exposed.db.updateReading).toBe('function');
  expect(typeof contextBridge._exposed.db.deleteReading).toBe('function');

  expect(contextBridge._exposed.units).toBeTruthy();
  expect(typeof contextBridge._exposed.units.update).toBe('function');

  // csv API is optional if you aborted earlier; guard if present
  if (contextBridge._exposed.csv) {
    expect(typeof contextBridge._exposed.csv.importStart).toBe('function');
    expect(typeof contextBridge._exposed.csv.onProgress).toBe('function');
  }
});
