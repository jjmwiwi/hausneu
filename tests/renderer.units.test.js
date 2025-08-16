/**
 * JSDOM tests for units rendering helpers
 */
jest.resetModules();

function setupDom() {
  document.body.innerHTML = `
    <div id="app">
      <div class="units-toolbar">
        <input id="units-search" />
        <input id="units-filter-persons" type="checkbox" />
        <select id="units-sort"><option value="updated_desc">Zuletzt</option></select>
      </div>
      <div id="list"></div>
    </div>
  `;
}

test('applyFiltersAndSort filters by search and persons', async () => {
  setupDom();
  const mod = require('../renderer/units.js'); // adjust path
  const state = {
    all: [
      { id:'1', bezeichnung:'Wohnung A', mieter:'Müller', anzahl_personen:0, flaeche:50, updatedAt: Date.now()-1000 },
      { id:'2', bezeichnung:'Wohnung B', mieter:'', anzahl_personen:2, flaeche:70, updatedAt: Date.now() }
    ],
    visible: [],
    search: 'Wohnung',
    onlyWithPersons: true,
    sort: 'updated_desc'
  };
  const out = mod._unitsTest.applyFiltersAndSort(state);
  expect(out.length).toBe(1);
  expect(out[0].id).toBe('2');
});

test('validatePatch enforces non-empty name and non-negative numbers', () => {
  const mod = require('../renderer/units.js');
  const bad = { bezeichnung:'', anzahl_personen:-1, flaeche:-5 };
  const resBad = mod._unitsTest.validatePatch(bad);
  expect(resBad.valid).toBe(false);

  const good = { bezeichnung:'Wohnung X', anzahl_personen:1, flaeche:45.5 };
  const resGood = mod._unitsTest.validatePatch(good);
  expect(resGood.valid).toBe(true);
});
